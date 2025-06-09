/* Copyright 2025 dodat */
/*---------------------------------------------------------------------------*
 * Renderer
 *      メインウィンドウ UIイベント
 *---------------------------------------------------------------------------*/

window.addEventListener("load", function(){
	const btnL: HTMLElement|null = document.getElementById("btn_launch");
	if(!btnL) return;
	btnL.addEventListener("click", async () => {
		const ele: HTMLInputElement|null = document.getElementById("post_url") as HTMLInputElement;
		if(!ele) return;
		const url: string = ele.value;
		if(url) window.AABridge.launch(url);
	});
	const btnP: HTMLElement|null = document.getElementById("btn_play");
	if(!btnP) return;
	btnP.addEventListener("click", function(){
		const ele: HTMLElement|null = document.getElementById("fa_play");
		if(!ele) return;
		const st: boolean = ele.classList.contains("fa-play");
		if(st) window.AABridge.play();
	});
	const btnR: HTMLElement|null = document.getElementById("btn_record");
	if(!btnR) return;
	btnR.addEventListener("change", async () => {
		const ele = btnR as HTMLInputElement;
		window.AABridge.record(ele.checked);
	});
});
