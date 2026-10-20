/// <reference lib="webworker" />
/** Runs the importer (importApi.ts) off the main thread. */
import * as Comlink from 'comlink';
import { api } from './importApi';

Comlink.expose(api);
