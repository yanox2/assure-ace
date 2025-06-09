/* Copyright 2025 dodat */
/*---------------------------------------------------------------------------*
 * Class - Utils
 *      汎用ユーティリティ
 *---------------------------------------------------------------------------*/

export function getLastMap<K, V>(map: Map<K, V>): [K, V]|null{
	let lastEntry: [K, V]|null = null;
	for(const entry of map) lastEntry = entry;
	return lastEntry;
}

export async function sleep(ms: number): Promise<void>{
	return new Promise(resolve => setTimeout(resolve, ms));
}
