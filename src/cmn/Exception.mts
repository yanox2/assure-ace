/* Copyright 2025 dodat */
/*---------------------------------------------------------------------------*
 * Class - Exception
 *      例外クラス
 *---------------------------------------------------------------------------*/

const SEP = ": ";

class Exception extends Error{
	public static LEVEL: number = 0;

	public errno?: number;
	public code?: string;
	public path?: string;
	public syscall?: string;

	private orgError_?:Error;

	constructor(msg: string, error?: any){
		if((!error)&&(Exception.LEVEL > 0)&&(msg)){
			console.error(msg);
			return;
		}

		let err: Error = error as Error;
		msg = msg ? msg + SEP + err.message : err.message;
		super("ERROR!!" + SEP + msg);
		this.orgError_ = err;
		if(err.name) this.name = err.name;
		if(err.stack) this.stack = err.stack;
		if(Exception.isErrnoException(err)){
			const exp = err as NodeJS.ErrnoException;
			this.errno = exp.errno;
			this.code = exp.code;
			this.path = exp.path;
			this.syscall = exp.syscall;
		}
		if(Exception.LEVEL > 0){
			const str = this.code ? this.code + SEP + this.message : this.message;
			console.error(str);
		}
		if(Exception.LEVEL > 1){
			if(this.stack) console.error(this.stack);
		}
	}

	public getOriginError(){
		return this.orgError_;
	}

	// type guard method
	public static isErrnoException(err: any): err is NodeJS.ErrnoException{
		return (err)&&(typeof err === "object")&&("code" in err)&&("errno" in err)&&("syscall" in err);
	}

	public static setLevel(level: number){
		if((level < 0)||(level > 2)) return;
		Exception.LEVEL = level;
	}

	public static log(msg: any, level?: number){
		if((!level)||(level < 0)||(level > 2)) level = Exception.LEVEL;
		if(level < 1) return;
		console.error("LOG: ", msg);
	}
}
export default Exception;
