import _Res = jy.Res;

export function load(uri: string, url?: string, queueID = _Res.ResQueueID.Normal): Promise<_Res.ResItem> {
    return new Promise((resolve) => {
        _Res.load(uri, url, jy.CallbackInfo.get(resolve), queueID)
    })
}

export function loadRes(resItem: _Res.ResItem, queueID = _Res.ResQueueID.Normal): Promise<_Res.ResItem> {
    return new Promise((resolve) => {
        _Res.loadRes(resItem, jy.CallbackInfo.get(resolve), queueID)
    })
}

export function loadList(list: _Res.ResItem[], group: jy.Key, onProgress?: jy.CallbackInfo<{ (item: _Res.ResItem): any }>, queueID = _Res.ResQueueID.Normal) {
    return new Promise<boolean>(resolve => {
        _Res.loadList(list, {
            callback: jy.CallbackInfo.get(resolve),
            group,
            onProgress
        }, queueID);
    })
}
