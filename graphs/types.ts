export interface Request {
    sampleId: string;
    orgId: string;
}

export enum ResponseType {
    INFO = 'info',
    ERROR = 'error',
    SUCCESS = 'success'
}

export interface ResponseData {
    content: object;
    status: string;
    error: string;
}
export interface Response {
    data: ResponseData;
    type: ResponseType;
}
