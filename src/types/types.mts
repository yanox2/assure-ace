/* Copyright 2025 dodat */
/*---------------------------------------------------------------------------*
 * types
 *      共通型定義
 *---------------------------------------------------------------------------*/

// 座標情報
export interface Coord{
	width: number;
	height: number;
	x: number;
	y: number;
}

// 設定ファイル
export interface Settings{
	mode: number;
	mainWinCoord: Coord;
	subWinCoord: Coord;
	defaultPlayer: number;
}

// リスナー
export interface CloseListener{
	onClose(coord: Coord): Promise<void>;
	onClosed(): Promise<void>;
}
export interface OpenListener{
	onOpen(): Promise<void>;
	onOpened(): Promise<void>;
}

// ブラウザリスナー
export interface BrowserCloseListener{
	onClosed(browserNo: number, tabNo: number, coord?: Coord): Promise<void>;
}

// E2ETestTool
export interface E2ETestTool{
	newInstance(): E2ETestTool;
	setBrowserNo(browserNo: number): void;
	setLoadScript(script: string): void;
	addCloseListener(lis: BrowserCloseListener): void;
	open(coord: Coord): Promise<void>;
	close(): Promise<void>;
	newTab(): Promise<void>;
	goto(tabNo: number, url: string): Promise<void>;
	action(tabNo: number, type: string, selector: string): Promise<number>;
}
