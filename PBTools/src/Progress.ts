/**
 * 用于控制进度条
 * 
 * @export
 * @class Progress
 */
export default class Progress {
    private _total = 0;
    private _current = 0;
    private _element: HTMLProgressElement;
    private _label: Element;

    private _changed: boolean;

    public bindProgress(element: HTMLProgressElement) {
        this._element = element;
        return this;
    }

    public bindLabel(label: Element) {
        this._label = label;
        return this;
    }

    public reset() {
        this._total = 0;
        this._current = 0;
        this.invalidate();
        return this;
    }

    /**
     * 增加总进度
     * 
     * @param {number} c
     */
    public addTask(c = 1) {
        this._total = this._total + c;
        this.invalidate();
        return this;
    }

    /**
     * 完成
     * 
     * @param {number} [c=1]
     * @returns
     */
    public endTask(c = 1) {
        this._current = this._current + c;
        this.invalidate();
        return this;
    }


    private invalidate() {
        if (!this._changed) {
            this._changed = true;
            setImmediate(this.doCheck);
        }
    }

    private doCheck = () => {
        if (!this._changed) {
            return;
        }
        this._changed = false;
        let { _element, _label, _current, _total } = this;
        if (_total < _current) {
            _total = _current;
        }
        if (_element) {
            let per = _current / _total;
            if (!isFinite(per)) {
                per = 1;
            }
            _element.value = _element.max * per;
        }
        if (_label) {
            _label.innerHTML = `${_current}/${_total}`;
        }
    }
}