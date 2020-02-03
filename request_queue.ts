import {fetchHandler} from './fetchHandler';

export class RequestQueue<T> {
    private static ACCUMULATE_PERIOD = 1000; //1 sec
    private static TIME_MAP: Map<string, number> = new Map<string, number>();
    private static QUEUE: Map<string, RequestWrapper> = new Map<string, RequestWrapper>();
    private static REQ_LOOP_INITED: boolean = false;

    public static makeRequest(
        input: RequestInfo,
        init?: RequestInit
    ) {
        let req = new RequestWrapper(input, init);
        const reqMethod = init.method || 'GET';
        const reqUrl = input;
        const key = reqUrl + reqMethod;
        let sameReqIsExist = RequestQueue.QUEUE.get(key);
        if (sameReqIsExist) {
            // @ts-ignore
            let newBody = RequestQueue.extendJsonObject(JSON.parse(sameReqIsExist.init.body), JSON.parse(req.init.body));
            sameReqIsExist.init.body = JSON.stringify(newBody);
        } else {
            RequestQueue.QUEUE.set(key, req);
        }
        RequestQueue.TIME_MAP.set(key, new Date().getTime());
        RequestQueue.initReqLoop();
    }

    static initReqLoop() {
        if (!this.REQ_LOOP_INITED) {
            this.REQ_LOOP_INITED = true;
            setTimeout(() => this.reqLoopProcessor(), 100);
        }
    }

    static reqLoopProcessor() {
        this.iterateReqQueue().then(()=>{
            this.REQ_LOOP_INITED = false;
            this.initReqLoop();
        }).catch(()=>{
            this.REQ_LOOP_INITED = false;
            this.initReqLoop();
        });
    }

    static iterateReqQueue =  () => {
        let promises: Array<Promise<any>> = [];
         RequestQueue.TIME_MAP.forEach( (value: number, key: string) => {
            let timeNow = new Date().getTime();
            if (timeNow - value > RequestQueue.ACCUMULATE_PERIOD) {
                const req: RequestWrapper = RequestQueue.QUEUE.get(key);
                promises.push(fetchHandler(req.input, req.init));
                RequestQueue.QUEUE.delete(key);
                RequestQueue.TIME_MAP.delete(key);
            }
        });
        return Promise.all(promises);
    };

    static extendJsonObject(json1: object, json2: object) {
        let res = {};
        $.extend(res, json1);
        $.extend(res, json2);
        return res
    }

}

class RequestWrapper{
    input: RequestInfo;
    init?: RequestInit;
    constructor(
        input: RequestInfo,
        init?: RequestInit
    ){
        this.input = input;
        this.init = init;
    }
}
