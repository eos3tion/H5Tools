/**
 * 创建Radio组
 * @param title 
 * @param value 
 * @param name 
 * @param parent 
 * @param checked 
 * @param onChange 
 */
export function createRadio(title: string, value: any, name: string, parent: Node, checked: boolean, onChange?: { (ev: Event) }) {
    const doc = document;
    let label = doc.createElement("label");
    parent.appendChild(label);
    let radio = doc.createElement("input");
    radio.value = value;
    radio.name = name;
    radio.checked = checked;
    radio.type = "radio";
    radio.addEventListener("change", onChange);
    label.appendChild(radio);
    let word = doc.createTextNode(title);
    label.appendChild(word);
}

type ValueElement = { setValue(value: number); getValue(): number };
export type NumberInputElement = HTMLElement & ValueElement;
/**
 * 创建一个数值控件
 * @param def 
 * @param min 
 * @param max 
 * @param onChange 
 * @param step 
 */
export function createNumberInput(def: number, min: number, max: number, onChange: { (value: number) }, step = 1): NumberInputElement {
    let stepper = document.createElement("input") as HTMLInputElement & ValueElement;
    stepper.type = "number";
    stepper.value = def + "";
    stepper.min = min + "";
    stepper.max = max + "";
    stepper.step = step + "";
    stepper.setValue = setValue;
    stepper.getValue = getValue;
    stepper.addEventListener("change", onStepperChange);
    return stepper;
    function getValue() {
        return +stepper.value;
    }
    function setValue(value: number) {
        stepper.value = value + "";
    }
    function onStepperChange() {
        onChange(getValue());
    }
}
