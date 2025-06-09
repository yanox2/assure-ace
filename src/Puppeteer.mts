/* Copyright 2025 dodat */
/*---------------------------------------------------------------------------*
 * Class - Puppeteer
 *      Puppeteer操作クラス
 *---------------------------------------------------------------------------*/
import puppeteer, { type Browser, type BrowserContext, type Page } from "puppeteer";
import type { Coord, E2ETestTool, BrowserCloseListener } from "./types/types.mjs";
import Exception from "./cmn/Exception.mjs";

class Puppeteer implements E2ETestTool{
	private no_: number = 0;
	private loadScript_?: string;
	private closeLis_: BrowserCloseListener[] = [];

	private browser_?: Browser;
	private context_?: BrowserContext;
	private pages_: Map<number, Page> = new Map();
	private count_: number = 0;
	private lastCoord_?: Coord;

	// My Electron 
	private myPage_?: Page;
	private static readonly MyPort__: string = "9900";

	public static async preproc(app: Electron.App){
		if(app.isReady()){
			throw new Exception("Must be called at startup before the electron app is ready.");
		}
		app.commandLine.appendSwitch("remote-debugging-port", Puppeteer.MyPort__);
		app.commandLine.appendSwitch("remote-debugging-address", "127.0.0.1");
		app.commandLine.appendSwitch("enable-features", "NetworkService");
	}

	public async getMyPage(): Promise<Page>{
		if(this.myPage_) return this.myPage_;
		const wsEndpoint: any = await this._getBrowserId("http://localhost:"+Puppeteer.MyPort__);
		//Exception.log(wsEndpoint);
		const browser: Browser = await puppeteer.connect({
			browserWSEndpoint: wsEndpoint,
			defaultViewport: null
		});
		const pages: Page[] = await browser.pages();
		for(let i=0; i<pages.length; i++){
			const title = await pages[i].title();
			if(title != "DevTools"){
				this.myPage_ = pages[i];
				break;
			}
		}
		if(!this.myPage_){
			throw new Exception("puppeteer connect error!");
		}
		return this.myPage_;
	}

	public async evaluate<T>(fn: (...args: any[])=>T, ...args: any[]): Promise<T|undefined>{
		try{
			return this.myPage_?.evaluate(fn, ...args);
		}catch(err){
			throw new Exception("evaluate error!", err);
		}
	}

	private async _getBrowserId(wsUrl: string): Promise<string>{
		let data;
		for(let i=0; i<3; i++){
			const res = await fetch(`${wsUrl}/json/version`);
			if(res.ok){
				data = await res.json();
				break;
			}else if(i < 2){
				await new Promise(resolve => setTimeout(resolve, 500));
			}else{
				throw new Error(`Failed to connect to ${wsUrl} after 3 attempts`);
			}
		}
		return data?.webSocketDebuggerUrl;
	}

/*---------------------------------------------------------------------------*
 * implements E2ETestTool
 *---------------------------------------------------------------------------*/
	public newInstance(){
		return new Puppeteer();
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
		Exception.log(`Puppeteer: open() ${this.no_}`);
		const width: number = coord.width;
		const height: number = coord.height;
		const x: number = coord.x;
		const y: number = coord.y;
		const opt1 = `--window-size=${width},${height}`; // ウィンドウのサイズを指定
		const opt2 = `--window-position=${x},${y}`; // ウィンドウの位置を指定
		try{
			this.browser_ = await puppeteer.launch({
				headless: false,
				args: [
					"--auto-open-devtools-for-tabs", // DevToolsを自動的に開く
					//"--disable-web-security",
					//"--disable-features=IsolateOrigins,site-per-process",
					"--no-first-run",
					//"--no-default-browser-check",
					//"--disable-default-apps",
					opt1, opt2
				]
			});
			//this.context_ = await this.browser_.createBrowserContext();
			this.lastCoord_ = coord;

		}catch(err){
			throw new Exception("Puppeteer: open failed.", err);
		}
		this._handlerContext();
		const page = (await this.browser_.pages())[0];
		this._handlerPage(page);
	}

	public async close(){
	}

	public async newTab(){
		Exception.log(`Puppeteer: newTab() ${this.no_}`);
		if(this.count_ == 1) return;
		try{
			await this.browser_?.newPage();
		}catch(err){
			throw new Exception("newPage error!", err);			
		}
	}

	public async goto(tabNo: number, url: string){
		Exception.log(`Puppeteer: goto(${tabNo}) ${this.no_}`);
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
		const page: Page|undefined = this.pages_.get(tabNo);
		if(!page) return -2;
		await page.waitForSelector(selector, { visible: true });
		await page.click(selector);
		return 0;
	}

	private _handlerContext(){
		// タブを開いた場合
		this.browser_?.on("targetcreated", async (target: any) => {
			if(target.type() !== "page") return;
			Exception.log(`Puppeteer: page opened! ${this.no_}`);
			this._handlerPage(await target.page());
		});

		// ブラウザが閉じられた場合
		this.browser_?.on("disconnected", async () => {
			Exception.log(`Puppeteer: context closed! ${this.no_}`);
			if(this.closeLis_){
				/* this.closeLis_.forEach(lis => {}); */
				for(const lis of this.closeLis_) lis.onClosed(this.no_, 0, this.lastCoord_);
			}
		});
	}

	private _handlerPage(newPage: Page){
		this.pages_.set(++this.count_, newPage);
		const tabNo: number = this.count_;
		Exception.log(`Puppeteer: page open=${this.no_} ${this.count_}`);

		// ページがロードされた場合（goto）
		newPage.on("load", async () => {
			Exception.log(`Puppeteer: page loaded! ${this.no_} ${tabNo}`);
			if(!this.loadScript_) return;
			let ext: string = this.loadScript_;
			ext += "\ntabNo=" + tabNo + "\n";
			const result = await newPage.evaluate(ext);
		});

		// タブを閉じた場合
		newPage.on("close", async () => {
			Exception.log(`Puppeteer: page closeed! ${this.no_} ${tabNo}`);
			this.pages_.delete(tabNo);
			if(this.pages_.size === 0) this.browser_?.close();
			if(this.closeLis_){
				for(const lis of this.closeLis_) lis.onClosed(this.no_, tabNo, this.lastCoord_);
			}
		});
	}

/*---------------------------------------------------------------------------*
 * private initialized browser methods
 *---------------------------------------------------------------------------*/
	private _setCSP(){
/*
		if(!this.win_) return;
		const ses:Session = this.win_.webContents.session;
		ses?.webRequest.onHeadersReceived((details, callback) => {
			const responseHeaders = details.responseHeaders as Record<string, string[] | string>;
			const ctype = responseHeaders["Content-Type"] || responseHeaders["content-type"];
			const isHtml = ctype ? ctype.toString().includes("text/html") : false;
			const isDevTool = details.url ? details.url.toString().includes("devtools://devtools") : false;
			if((isHtml)&&(!isDevTool)){
				const cspHeader = responseHeaders["Content-Security-Policy"];
				//const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src * 'unsafe-inline';";
				const csp = "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;";
				if(!cspHeader){
					responseHeaders["Content-Security-Policy"] = [csp];
				}
			}
			callback({ cancel:false, responseHeaders });
		});
*/
	}
}
export default Puppeteer;
