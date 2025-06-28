/* Copyright 2025 dodat */
/*---------------------------------------------------------------------------*
 * Class - ScriptBuilder
 *      スクリプト変換・出力・再生
 *---------------------------------------------------------------------------*/
import { WebSocketServer } from "ws";
import { VERSION } from "./constants/defines.mjs";
import type { Coord, BrowserCloseListener } from "./types/types.mjs";
import Exception from "./cmn/Exception.mjs";
import JSONFile from "./cmn/JSONFile.mjs";
import BaseWindow from "./cmn/BaseWindow.mjs";
import SimBrowser from "./SimBrowser.mjs";
import Puppeteer from "./Puppeteer.mjs";

declare function play(): void;
declare function pause(doPause: boolean): void;
declare function stop(): void;
declare function addLine(id: number, num: number, lineStr: string, followId: number|undefined): void;
declare function removeLine(id: number, num: number): void;
declare function allClear(title: string, num: number): void;
declare function openStepModal(id: number, op: Operation): void;

type TestCaseType = {
	title: string;
	steps: [number, Operation][];
}

class ScriptBuilder implements BrowserCloseListener{
	private static readonly Port__: number = 9910;
	private readonly icons_ = new Map<string, string>([
		["textarea", "fa-pencil-square-o"], ["option", "fa-list-ul"], ["svg", "fa-file-image-o"],
		["text", "fa-pencil-square"], ["password", "fa-unlock-alt"], ["checkbox", "fa-check-square-o"],
		["radio", "fa-dot-circle-o"], ["file", "fa-upload"], ["button", "fa-hand-o-down"], ["submit", "fa-floppy-o"], ["image", "fa-picture-o"]
	]);
	private readonly eventStrs_ = new Map<string, string>([
		["click", "クリック"], ["change", "選択"], ["fill", "入力"]
	]);

	private myPage_: Puppeteer = new Puppeteer();
	private win_?: Electron.WebContents;

	private simBrowser_: SimBrowser;
	private wss_?: WebSocketServer;

	private title_: string = "";
	private steps_: Map<number, Operation> = new Map();
	private ids_: number[] = [];
	private count_: number = 0;

	private playing_: boolean = false;
	private recording_: boolean = false;

	constructor(myPage?: Puppeteer, win?: Electron.WebContents){
		if(myPage) this.myPage_ = myPage;
		this.win_ = win;
		this.simBrowser_ = new SimBrowser();
		this._handler();
		this.ids_[0] = 0;
		//this.test();
	}

	private _handler(){
	}

	public receiver(){
		this.wss_ = new WebSocketServer({host:"localhost", port:ScriptBuilder.Port__});
		this.wss_.on("connection", (ws) => {
			ws.on("message", (msg: Buffer|string) => {
				if(!this.recording_) return;
				try{
					//const message = msg instanceof Buffer ? msg.toString() : msg;
					const op: Operation = JSON.parse(msg as string);
					if(op.version != VERSION) return;
					op.id = ++this.count_;
					Exception.log(op);
					this.steps_.set(op.id, op);
					this.ids_.push(op.id);
					const lineStr: string = this._getLineStr(op);
					this._dispLine(op.id, lineStr);

				}catch(err){
					new Exception("Failed to parse message as JSON:", err);
				}
			});
		});
	}

	public numSteps(): number{
		return this.steps_.size;
	}

	public getStep(id: number): Operation|undefined{
		return this.steps_.get(id);
	}

/*---------------------------------------------------------------------------*
 * for Menu control
 *---------------------------------------------------------------------------*/
	public async save(title: string, path: string){
		this._optimize();
		const testCase: TestCaseType = {
			title: title,
			steps: Array.from(this.steps_.entries())
		};
		const json = new JSONFile(path);
		await json.writeFile(title+".ace", testCase);

		this.title_ = title;
		await this._refresh();
	}

	private _optimize(){
		const steps = new Map<number, Operation>;
		const ids: number[] = [];
		ids[0] = 0;

		// id振り直し
		Array.from(this.steps_.values()).forEach((val, pos) => {
			val.id = pos+1;
			steps.set(val.id, val);
			ids[pos+1] = val.id;
		});

		this.steps_ = steps;
		this.ids_ = ids;
		this.count_ = steps.size;
	}

	public async load(filename: string, path: string): Promise<string>{
		const json = new JSONFile(path);
		const testCase: TestCaseType = await json.readFile(filename);

		this.title_ = testCase.title;
		this.steps_ = new Map(testCase.steps);
		this.count_ = this.steps_.size;
		this.ids_ = Array.from({length:this.count_}, (_, i) => i);
		await this._refresh();
		return this.title_;
	}

	public async allClear(title: string){
		this.title_ = title;
		this.steps_.clear();
		this.ids_ = [];
		this.count_ = 0;
		await this._refresh();
	}

	private async _refresh(){
		const title = this.title_;
		const num = this.count_;
		await this.myPage_.evaluate((title: string, num: number) => {
			allClear(title, num);
		}, title, num).catch();

		this.steps_.forEach((val) => {
			const lineStr: string = this._getLineStr(val);
			this._dispLine(val.id, lineStr);
		});
	}

/*---------------------------------------------------------------------------*
 * for UI Button control
 *---------------------------------------------------------------------------*/
	public record(st: boolean): number{
		if(st == this.recording_) return 0;
		if(this.playing_) return -1;
		this.recording_ = st;
		return 1;
	}

	public async play(): Promise<number>{
		if(this.playing_) return 0;
		this.playing_ = true;
		this.recording_ = false;
		await this.myPage_.evaluate(() => {
			play();
		}).catch();
		this._play();
		return 1;
	}

	public async pause(doPause: boolean): Promise<number>{
		await this.myPage_.evaluate((doPause: boolean) => {
			pause(doPause);
		}, doPause).catch();
		return 0;
	}

	public async stop(){
		this.playing_ = false;
		await this.myPage_.evaluate(() => {
			stop();
		}).catch();
		this._stop();
	}

	private async _play(){
		/*for(let i=0; i<this.ids_.length; i++){
			const id = this.ids_[i];
			const op: Operation|undefined = this.steps_.get(id);
			if(!op) continue;
			await this.myPage_.evaluate((op: Operation) => {
				playStep(op);
			}, op).catch();
		}*/
		BaseWindow.alert(0, "スクリプトの実行が終了しました。");
	}

	private async _stop(){
	}

/*---------------------------------------------------------------------------*
 * for Sub menu selected
 *---------------------------------------------------------------------------*/
	public async menuTestStep<T>(orgId: number, menu: number, adds?: T): Promise<Operation|undefined>{
		let op: Operation|undefined = {
			version:VERSION, id:0, browserNo:1, tabNo:1, eventType:"", params:"", context:null,
			selector1:"", selector2:"", requiredItems:null, requiredSelectors:null, scripts:""
		};
		const no = this.ids_.indexOf(orgId);

		if(menu == 0){ // update
			op = this.steps_.get(orgId);

		}else if(menu == 4){ // delete
			this.steps_.delete(orgId);
			this.ids_.splice(no, 1);
			const num = this.steps_.size;
			await this.myPage_.evaluate((id: number, num: number) => {
				removeLine(id, num);
			}, orgId, num).catch();
			op = undefined;

		}else{ // 1, 2, 3, 98, 99
			if(menu == 1){ // addSleep
				op.eventType = "sleep";
				op.params = "1000";
			}else if(menu == 2){ // addSS
				op.eventType = "screenshot";
				op.params = op.browserNo+"," + op.tabNo;
			}else if(menu == 3){ // addCheck
				op.eventType = "check";
			}else if(menu == 98){ // close tab
				op.eventType = "closetab";
				if(Array.isArray(adds)){
					op.browserNo = adds[0];
					op.tabNo = adds[1];
				}
			}else if(menu == 99){ // close window
				op.eventType = "closewin";
				if(Array.isArray(adds)){
					op.browserNo = adds[0];
					op.tabNo = adds[1];
				}
			}
			op.id = ++this.count_;
			this.steps_.set(op.id, op);
			this.ids_.splice(no+1, 0, op.id);
			const lineStr: string = this._getLineStr(op);
			this._dispLine(op.id, lineStr, orgId);
		}
		Exception.log(this.ids_);
		return op;
	}

	private _getLineStr(op: Operation): string{
		let browserStr = ` 【${op.browserNo.toString().padStart(2,"0")}-${op.tabNo.toString().padStart(2,"0")}】`;
		let lineStr = "";
		if(op.eventType == "sleep"){
			lineStr = `<i class="fa fa-moon-o"></i> ${op.params} ms のスリープ`;
		}else if(op.eventType == "screenshot"){
			const str: string = op.params.replace(",", "-");
			lineStr = `<i class="fa fa-camera"></i> ブラウザのキャプチャ (${str})`;
		}else if(op.eventType == "check"){
			lineStr = `<i class="fa fa-code"></i> チェックスクリプト`;
		}else if(op.eventType == "closetab"){
			lineStr = `<i class="fa fa-times-circle-o"></i> タブを閉じる`;
		}else if(op.eventType == "closewin"){
			lineStr = `<i class="fa fa-times"></i> ブラウザを閉じる`;
			browserStr = ` 【${op.browserNo.toString().padStart(2,"0")}】`;
		}
		if(lineStr) return lineStr + browserStr;

		// {tagName}の{source}を{action}
		// {tagName}の{id/name/text}を{クリック/選択/入力}
		if(!op.context) return "";
		const id: number = op.id;
		const tagName: string = op.context.tagName;
		const action: string|undefined = this.eventStrs_.get(op.eventType);
		let source: string = op.context.id;
		if(!source) source = op.context.name;
		if(!source) source = op.context.text;
		let icon: string|undefined = this.icons_.get(op.context.tagName);
		if(op.context.type) icon = this.icons_.get(op.context.type);
		if(!icon) icon = "fa-code";
		lineStr = `<i class="fa ${icon}"></i> ${tagName} の<code>${source}</code>を${action}`;
		return lineStr + browserStr;
	}

	private async _dispLine(id: number, lineStr: string, followId?: number){
		const num = this.steps_.size;
		await this.myPage_.evaluate((id: number, num: number, lineStr: string, followId: number) => {
			addLine(id, num, lineStr, followId);
		}, id, num, lineStr, followId).catch();
		/*await this.win_?.executeJavaScript(`
			addLine(${id}, "${lineStr}", "${followId}"");
		`).catch(err => {
			new Exception("evaluate error occured.", err);
		});*/
	}

/*---------------------------------------------------------------------------*
 * for Sub menu posted
 *---------------------------------------------------------------------------*/
	public async editTestStep(data: Record<string, unknown>): Promise<number>{
		const crrt: Operation|undefined = this.steps_.get(Number(data["post_id"]));
		Exception.log(data);
		Exception.log(crrt);
		if(!crrt) return -1;
		if(!crrt.context) return -1;

		// contextの生成
		const postcon = {
				id: data["post_SelType1_val"] as string,
				text: data["post_SelType2_val"] as string,
				name: data["post_SelType3_val"] as string,
				type: data["post_SelType4_val"] as string,
				value: data["post_SelType5_val"] as string,
				label: data["post_SelType6_val"] as string,
				dataId: data["post_SelType7_val"] as string
		};
		const context: EventContext = JSONFile.merge(crrt.context, postcon);

		// checkboxの状態からrequiredItemsを構築（チェックありかつ値があるもののみtrue）
		const requiredItems: Record<string, boolean> = {};
		requiredItems["id"] = (data["post_SelType1"] === "1") && !!(data["post_SelType1_val"] as string)?.trim();
		requiredItems["text"] = (data["post_SelType2"] === "1") && !!(data["post_SelType2_val"] as string)?.trim();
		requiredItems["name"] = (data["post_SelType3"] === "1") && !!(data["post_SelType3_val"] as string)?.trim();
		requiredItems["type"] = (data["post_SelType4"] === "1") && !!(data["post_SelType4_val"] as string)?.trim();
		requiredItems["value"] = (data["post_SelType5"] === "1") && !!(data["post_SelType5_val"] as string)?.trim();
		requiredItems["label"] = (data["post_SelType6"] === "1") && !!(data["post_SelType6_val"] as string)?.trim();
		requiredItems["dataId"] = (data["post_SelType7"] === "1") && !!(data["post_SelType7_val"] as string)?.trim();
		const newSelector1 = this._generateTextSelector(crrt.selector1, context, requiredItems);

		// requiredSelectorsの状態を構築
		const requiredSelectors: Record<string, boolean> = {};
		requiredSelectors["selector1"] = (data["post_Enable1"] === "1");
		requiredSelectors["selector2"] = (data["post_Enable2"] === "1");
		
		const post = {
			params: data["post_Enter"] as string,
			context: context,
			selector1: newSelector1,
			selector2: data["post_Selector2"] as string,
			requiredItems: requiredItems,
			requiredSelectors: requiredSelectors,
			scripts: ""
		};
		const op: Operation = JSONFile.merge(crrt, post);
		this.steps_.set(op.id, op);
		this._optimize();
		await this._refresh();

		const str = data["post_id"]
			+ "/" + data["post_SelType1_val"] + "/" + data["post_SelType2_val"] + "/" + data["post_SelType3_val"] + "/" + data["post_SelType4_val"]
			+ "/" + data["post_SelType5_val"] + "/" + data["post_SelType6_val"] + "/" + data["post_SelType7_val"]
			+ "/" + data["post_Enter"] + "/" + data["post_Selector1"] + "/" + data["post_Selector2"]
			+ "/" + data["post_SelType1"] + "/" + data["post_SelType2"] + "/" + data["post_SelType3"] + "/" + data["post_SelType4"]
			+ "/" + data["post_SelType5"] + "/" + data["post_SelType6"] + "/" + data["post_SelType7"]
			+ "/" + data["post_Enable1"] + "/" + data["post_Enable2"];
		Exception.log(str);
		Exception.log(op);
		return 0;
	}

/*---------------------------------------------------------------------------*
 * private methods for Selector Generation
 *---------------------------------------------------------------------------*/
	// 最後の//以下を新しくgenerateしたものに置き換える
	private _generateTextSelector(orgSelector: string, context: EventContext, requiredItems: Record<string, boolean>): string{
		const DES: string = "//";
		const attributeMap: Record<string, string> = {
			id: `@id="${context.id}"`,
			text: `text()="${context.text}"`,
			name: `name="${context.name}"`,
			type: `@type="${context.type}"`,
			value: `@value="${context.value}"`,
			label: `@aria-label="${context.label}"`,
			dataId: `@data-id="${context.dataId}"`
		};

		// 新しいセレクタ部分を生成
		let newPart = `${context.tagName}`;
		for(const [key, value] of Object.entries(requiredItems)){
			if((value)&&(key in attributeMap)){
				newPart += `[${attributeMap[key]}]`;
			}
		}

		// 元のselectorの最後の//を見つけて、それ以降を新しいセレクタ部分で置き換える
		const index = orgSelector.lastIndexOf(DES);
		if(index === -1) return DES + newPart;
		const prefix = orgSelector.substring(0, index + 2);
		return prefix + newPart;
	}

/*---------------------------------------------------------------------------*
 * implements BrowserCloseListener
 *---------------------------------------------------------------------------*/
	// recorder browserの閉じるイベント
	public async onClosed(browserNo: number, tabNo: number, coord?: Coord){
		if(!this.recording_) return;
		const menu: number = (tabNo != 0) ? 98 : 99;
		this.menuTestStep(this.ids_.length-1, menu, [browserNo, tabNo]);
	}

/*---------------------------------------------------------------------------*
 * test
 *---------------------------------------------------------------------------*/
	public async test(){
		const val2 = await this.myPage_.evaluate(() => {
			console.log("fff");
			var ele = document.getElementById("post_url") as HTMLInputElement;
			if(ele) return ele.value;
			return "ggg";
		}).catch((err) =>{
			new Exception("evaluate2 error occured.", err);
		});
		console.log(val2);
///*
		this.myPage_.evaluate(() => {
			var ele = document.getElementById("id_steps");
			var tag:string = '<tr>'
				+ '<td>4</td>'
				+ ' <td>'
				+ '  <i class="fa fa-pencil-square-o"></i>'
				+ '  　textbox の<code>id_XXXXXXXX</code>に入力'
				+ ' </td>'
				+ ' <td class="text-right"><span class="label label-default">Enable</span></td>'
				+ ' <td class="text-right">'
				+ '  <div class="btn-group text-center" style="width:15px;">'
				+ '   <i class="fa fa-ellipsis-v"></i>'
				+ '  </div>'
				+ ' </td>'
				+ ' </tr>';
			if(ele) ele.insertAdjacentHTML("beforeend", tag);
		});
//*/
	}
}
export default ScriptBuilder;
