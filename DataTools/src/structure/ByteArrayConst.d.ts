declare const enum ByteArraySize {
    /**
     * 1B
    */
    SIZE_OF_BOOLEAN = 1,
    /**
     * 1B
     */
    SIZE_OF_INT8 = 1,
    /**
     * 2B
     */
    SIZE_OF_INT16 = 2,
    /**
     * 4B
     */
    SIZE_OF_INT32 = 4,
    /**
     * 1B
     */
    SIZE_OF_UINT8 = 1,
    /**
     * 2B
     */
    SIZE_OF_UINT16 = 2,
    /**
     * 4B
     */
    SIZE_OF_UINT32 = 4,
    /**
     * 4B
     */
    SIZE_OF_FLOAT32 = 4,
    /**
     * 8B
     */
    SIZE_OF_FLOAT64 = 8,

    SIZE_OF_FIX64 = 8,

    SIZE_OF_FIX32 = 4,
    SIZE_OF_SFIX32 = 4,
    SIZE_OF_DOUBLE = 8,
    SIZE_OF_FLOAT = 4,
}

//AMF3 常量集
declare const enum AMF3_TYPE {
    /**0x0 */
    UNDEFINED = 0,
    /**0x1 */
    NULL = 0x1,
    /**0x2 */
    FALSE = 0x2,
    /**0x3 */
    TRUE = 0x3,
    /**0x4 */
    INTEGER = 0x4,
    /**0x5 */
    DOUBLE = 0x5,
    /**0x6 */
    STRING = 0x6,
    /**0x7 */
    XMLDOC = 0x7,
    /**0x8 */
    DATE = 0x8,
    /**0x9 */
    ARRAY = 0x9,
    /**0xA */
    OBJECT = 0xA,
    /**0xB */
    XML = 0xB,
    /**0xC */
    BYTEARRAY = 0xC,
    /**0xD */
    VECTOR_INT = 0xD,
    /**0xE */
    VECTOR_UINT = 0xE,
    /**0xF */
    VECTOR_DOUBLE = 0xF,
    /**0x10 */
    VECTOR_OBJECT = 0x10,
    /**0x11 */
    DICTONARY = 0x11
}

/**
 * Endian 类中包含一些值，它们表示用于表示多字节数字的字节顺序。
 * 字节顺序为 bigEndian（最高有效字节位于最前）或 littleEndian（最低有效字节位于最前）。
 */
declare const enum Endian {

    /**
     * 表示多字节数字的最低有效字节位于字节序列的最前面。
     * 十六进制数字 0x12345678 包含 4 个字节（每个字节包含 2 个十六进制数字）。最高有效字节为 0x12。最低有效字节为 0x78。（对于等效的十进制数字 305419896，最高有效数字是 3，最低有效数字是 6）。
     */
    LITTLE_ENDIAN,

    /**
     * 表示多字节数字的最高有效字节位于字节序列的最前面。
     * 十六进制数字 0x12345678 包含 4 个字节（每个字节包含 2 个十六进制数字）。最高有效字节为 0x12。最低有效字节为 0x78。（对于等效的十进制数字 305419896，最高有效数字是 3，最低有效数字是 6）。
     */
    BIG_ENDIAN

}