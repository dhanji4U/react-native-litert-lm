/// <reference types="nativewind/types" />

// Declares that CSS side-effect imports are valid modules
declare module '*.css' {
    const content: any;
    export default content;
}