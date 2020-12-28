import * as SelectMapDir from "./SelectMapDir";
import * as EditMapInfo from "./EditMapInfo";
import * as Edit from "./edit/Edit";
import { Core } from "./Core";
Object.defineProperty(jy.Global, "webp", {
    value: "",
    writable: true,
    configurable: true
});

const states: { [state: number]: ViewState } = {
    [AppState.SelectMapDir]: SelectMapDir,
    [AppState.EditMapInfo]: EditMapInfo,
    [AppState.Edit]: Edit
}

jy.Global.initTick();
requestAnimationFrame(onTick);
let tickFlag = true;
function onTick() {
    if (tickFlag) {
        requestAnimationFrame(onTick);
        egret.ticker.update();
    }
}
jy.on(ConstString.EventBeforeRunEgret, function () {
    tickFlag = false;
})

function show(view: HTMLElement) {
    document.documentElement.getElementsByTagName("body")[0].appendChild(view);
}

let currentView: ViewState;
function setState(state: AppState, data?: any) {
    let newView = states[state];
    if (currentView != newView) {
        if (currentView) {
            Core.hide(currentView.view);
        }
        currentView = newView;
        show(currentView.view);
        currentView.setData && currentView.setData(data);
    }
}

for (let key in states) {
    let state = states[key];
    Core.hide(state.view);
}

setState(AppState.SelectMapDir);

jy.on(AppEvent.StateChange, e => {
    let [state, data] = e.data;
    setState(state, data);
})