/* Copyright 2025 dodat */
/*---------------------------------------------------------------------------*
 * Class - Playwright
 *      Playwright操作クラス
 *---------------------------------------------------------------------------*/
import {chromium,  type Browser, type BrowserContext, type Page } from "playwright-core";
import type { Coord, E2ETestTool, BrowserCloseListener } from "./types/types.mjs";
import Exception from "./cmn/Exception.mjs";

class Playwright implements E2ETestTool{
	private no_: number = 0;
	private loadScript_?: string;
	private closeLis_: BrowserCloseListener[] = [];

	private browser_?: Browser;
	private context_?: BrowserContext;
	private pages_: Map<number, Page> = new Map();
	private count_: number = 0;
	private lastCoord_?: Coord;

/*---------------------------------------------------------------------------*
 * implements E2ETestTool
 *---------------------------------------------------------------------------*/
	public newInstance(){
		return new Playwright();
	}

	public setBrowserNo(browserNo: number){
		this.no_ = browserNo;
	}

	public setLoadScript(script: string){
		this.loadScript_ = script;
	}

	public addCloseListener(lis: BrowserCloseListener){
		this.closeLis_.push(lis);
	}

	public async open(coord: Coord){
		Exception.log(`Playwright: open() ${this.no_}`);
		const width: number = coord.width;
		const height: number = coord.height;
		const x: number = coord.x;
		const y: number = coord.y;
		const opt1 = `--window-size=${width},${height}`; // ウィンドウのサイズを指定
		const opt2 = `--window-position=${x},${y}`; // ウィンドウの位置を指定
		try{
			this.browser_ = await chromium.launch({
				headless: false,
				args: ["--auto-open-devtools-for-tabs", // DevToolsを自動的に開く
					opt1, opt2
				]
			});
			this.context_ = await this.browser_.newContext();
			this.lastCoord_ = coord;

		}catch(err){
			throw new Exception("Playwright: open failed.", err);
		}
		this._handlerContext();
	}

	public async close(){
	}

	public async newTab(){
		Exception.log(`Playwright: newTab() ${this.no_}`);
		try{
			await this.context_?.newPage();
		}catch(err){
			throw new Exception("newPage error!", err);			
		}
	}

	public async goto(tabNo: number, url: string){
		Exception.log(`Playwright: goto(${tabNo}) ${this.no_}`);
		const page: Page|undefined = this.pages_.get(tabNo);
		if(!page){
			throw new Exception("No Page exists. tabNo=" + tabNo);
		}
		try{
			await page.goto(url);
		}catch(err){
			throw new Exception("goto and renderer error.");
		}
	}

	public async action(tabNo: number, type: string, selector: string): Promise<number>{
		return 0;
	}

	private _handlerContext(){
		// タブを開いた場合
		this.context_?.on("page", async (newPage: Page) => {
			Exception.log(`Playwright: page opened! ${this.no_}`);
			this._handlerPage(newPage);
		});

		// ブラウザが閉じられた場合
		this.context_?.on("close", async () => {
			Exception.log(`Playwright: context closed! ${this.no_}`);
			if(this.closeLis_){
				for(const lis of this.closeLis_) lis.onClosed(this.no_, 0, this.lastCoord_);
			}
		});
	}

	private _handlerPage(newPage: Page){
		this.pages_.set(++this.count_, newPage);
		const tabNo: number = this.count_;
		Exception.log(`Playwright: page open=${this.no_} ${this.count_}`);

		// ページがロードされた場合（goto）
		newPage.on("load", async () => {
			Exception.log(`Playwright: page loaded! ${this.no_} ${tabNo}`);
			if(!this.loadScript_) return;
			let ext: string = this.loadScript_;
			ext += "\ntabNo=" + tabNo + "\n";
			const result = await newPage.evaluate(ext);
		});

		// タブを閉じた場合
		newPage.on("close", async () => {
			Exception.log(`Playwright: page closeed! ${this.no_} ${tabNo}`);
			/*this.lastCoord_ = await newPage.evaluate(() => {
				return {
					width: window.outerWidth,
					height: window.outerHeight,
					x: window.screenX,
					y: window.screenY
				};
			});*/
			this.pages_.delete(tabNo);
			if(this.pages_.size === 0) this.browser_?.close(); 
			if(this.closeLis_){
				for(const lis of this.closeLis_) lis.onClosed(this.no_, tabNo, this.lastCoord_);
			}
		});
	}
}
export default Playwright;
