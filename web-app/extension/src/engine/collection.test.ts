// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { collectChunk, atListEnd } from './collection';
import { listItems } from './dom';
import { postUrl, mediaUrl, postPreview, postIdentity } from './media';

const row = (id:string) => `<article role="article"><input type="checkbox" aria-label="Select post"><a href="https://www.facebook.com/person/posts/${id}?__tn__=tracking">Tagged post ${id}</a><img width="200" src="https://scontent.xx.fbcdn.net/${id}.jpg" alt="A mountain"></article>`;
afterEach(()=>{vi.useRealTimers();document.body.innerHTML='';});

describe('coverage and post previews',()=>{
 it('deduplicates alternate post and video permalinks',()=>{
   expect(postIdentity('https://www.facebook.com/story.php?story_fbid=123&id=456')).toBe(postIdentity('https://www.facebook.com/person/posts/123/'));
   expect(postIdentity('https://www.facebook.com/watch?v=789')).toBe(postIdentity('https://www.facebook.com/person/videos/789'));
 });
 it('retains rows removed by virtualization and stops at an explicit end',async()=>{
   vi.useFakeTimers();document.body.innerHTML=row('111');
   let pass=0;
   const render = setInterval(()=>{pass++;document.body.innerHTML=row(String(111+pass))+(pass===3?'<p>You have reached the end</p>':'');},100);
   const work = collectChunk(document,5,Infinity,100);
   await vi.advanceTimersByTimeAsync(350);
   const result=await work; clearInterval(render);
   expect(result.ok).toBe(true);
   if(result.ok){expect(result.complete).toBe(true);expect(result.items?.length).toBe(4);}
 });
 it('does not call a stalled list complete or treat post text as an end marker',async()=>{
   vi.useFakeTimers();document.body.innerHTML=row('111')+'<article><span>Nothing to show</span></article>';
   expect(atListEnd(document)).toBe(false);
   const work=collectChunk(document,3,Infinity,100);await vi.advanceTimersByTimeAsync(300);
   const result=await work;expect(result.ok && result.complete).toBe(false);
 });
 it('recognizes an explicitly empty list',async()=>{
   document.body.innerHTML='<p>No activity to show</p>';
   expect(await collectChunk(document)).toMatchObject({ok:true,complete:true,items:[]});
 });
 it('keeps identity stable when rows move and normalizes tracking links',()=>{
   document.body.innerHTML=row('111')+row('222');const original=listItems(document).map(x=>x.item);
   document.body.innerHTML=row('222');const moved=listItems(document)[0]!.item;
   expect(moved.key).toBe(original[1]!.key);expect(moved.url).toBe('https://www.facebook.com/person/posts/222');
   expect(moved.thumbnail).toBe('https://scontent.xx.fbcdn.net/222.jpg');
 });
 it('refuses unrelated and executable links, but permits genuine permalinks',()=>{
   for(const url of ['javascript:alert(1)','https://evil.com/posts/123','https://facebook.com.evil.com/posts/123','https://www.facebook.com/profile.php?id=1','https://www.facebook.com/photo.php'])expect(postUrl(url)).toBeUndefined();
   expect(postUrl('https://m.facebook.com/photo.php?fbid=123&set=a.12')).toBe('https://www.facebook.com/photo.php?fbid=123');
   expect(postUrl('https://www.instagram.com/p/abc/?utm_source=x')).toBe('https://www.instagram.com/p/abc/');
   expect(mediaUrl('https://evil.com/track.gif')).toBeUndefined();
 });
 it('reads visible post content without embedding the platform',()=>{
   document.body.innerHTML=row('111').replace('</article>','<div data-ad-preview="message">Actual caption</div></article>');
   expect(postPreview(document)).toMatchObject({postText:'Actual caption',thumbnail:'https://scontent.xx.fbcdn.net/111.jpg',previewChecked:true});
 });
});
