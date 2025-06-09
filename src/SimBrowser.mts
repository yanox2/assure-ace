/* Copyright 2025 dodat */
/*---------------------------------------------------------------------------*
 * Class - SimBrowser
 *      シミュレーションブラウザ
 *---------------------------------------------------------------------------*/
import type { Coord, BrowserCloseListener, E2ETestTool } from "./types/types.mjs";
import Exception from "./cmn/Exception.mjs";
import { readFile } from "./cmn/Filer.mjs";
import AppBase from "./cmn/AppBase.mjs";
import Playwright from "./Playwright.mjs";
import Puppeteer from "./Puppeteer.mjs";

class SimBrowser implements BrowserCloseListener{
	private recorder_: E2ETestTool;
	private loadScript_?: string;
	private closeLis_?: BrowserCloseListener;

	private windows_: Map<number, E2ETestTool> = new Map();
	private no_: number = 0;

	constructor(){
		//this.recorder_ = new Playwright();
		this.recorder_ = new Puppeteer();
	}

	public async setScript(dir: string, fileName: string){
		try{
			//this.loadScript_ = await fs.readFile(path.join(AppBase.dirname, "ipc/loadScript.js"), "utf8");
			this.loadScript_ = await readFile(dir, fileName);
		}catch(err){
			throw new Exception("Failed to open loadScript", err);
		}
	}

	public setCloseListener(lis: BrowserCloseListener){
		this.closeLis_ = lis;
	}

	public numWindows(): number{
		return this.windows_.size;
	}

	public async launch(): Promise<number>{
		const tool: E2ETestTool = this.recorder_.newInstance();
		this.windows_.set(++this.no_, tool);
		Exception.log("launch no:" + this.no_ + " sz:" + this.windows_.size + " key:" + Array.from(this.windows_.keys()));
		tool.setBrowserNo(this.no_);
		if(this.loadScript_){
			let ext: string = this.loadScript_;
			ext += "\nbrowserNo=" + this.no_ + "\n";
			tool.setLoadScript(ext);
		}
		tool.addCloseListener(this);
		if(this.closeLis_) tool.addCloseListener(this.closeLis_);

		try{
			const coord: Coord|undefined = AppBase.getSettings("subWinCoord");
			if(coord) await tool.open(coord);
			await tool.newTab();
		}catch(err){
			throw new Exception("Failed to open page", err);
		}
		return this.no_;
	}

	public async goto(browserNo: number, tabNo: number, url: string){
		await this.windows_.get(browserNo)?.goto(tabNo, url);
	}

	public async action(browserNo: number, tabNo: number, type: string, selector: string): Promise<number>{
		const win: E2ETestTool|undefined = this.windows_.get(browserNo);
		if(!win) return -1;
		return await win.action(tabNo, type, selector);
	}

/*---------------------------------------------------------------------------*
 * implements BrowserCloseListener
 *---------------------------------------------------------------------------*/
	public async onClosed(browserNo: number, tabNo: number, coord?: Coord){
		if(tabNo > 0) return;
		this.windows_.delete(browserNo);
		Exception.log("close no:" + browserNo + " sz:" + this.windows_.size + " key:" + Array.from(this.windows_.keys()));
		if(!coord) return;
		AppBase.setSettings("subWinCoord", coord);
		await AppBase.saveSettings();
	}
}
export default SimBrowser;
