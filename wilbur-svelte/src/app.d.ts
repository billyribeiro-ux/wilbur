/// <reference types="@sveltejs/kit" />

import type PocketBase from 'pocketbase';
import type { User } from '$lib/types';

declare global {
	namespace App {
		interface Locals {
			pb: PocketBase;
			user: User | null;
		}
		interface Error {
			message: string;
			code?: string;
		}
		interface PageData {
			user: User | null;
		}
		interface PageState {}
		interface Platform {}
	}
}

export {};
