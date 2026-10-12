/* @lucky-canvas/react 官方包未附带 .d.ts；这里以宽松声明放行（组件为类组件，
   props 由 lucky-canvas config 决定，运行时无类型保障但可正常工作）。 */
declare module "@lucky-canvas/react" {
  const _default: any;
  export const LuckyWheel: any;
  export const LuckyGrid: any;
  export const SlotMachine: any;
  export default _default;
}