export enum Type {
    IntType = "IntType",
    DoubleType = "DoubleType",
    BooleanType = "BooleanType",
    ColorType = "ColorType",
    StringType = "StringType",
    VoidType = "VoidType"
}

export interface Color {
    readonly r: number
    readonly g: number
    readonly b: number
}
