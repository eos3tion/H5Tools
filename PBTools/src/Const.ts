const enum Options {
	/**
	 * 服务名称
	 */
    ServiceName = "(service)",
	/**
	 * 客户端模块
	 */
    ClientModule = "(cmodule)",
	/**
	 * 客户端路径，和前缀路径拼接得到文件生成路径地址
	 */
    ClientPath = "(cpath)",
	/**
	 * 通信用指令
	 */
    CMD = "(cmd)",
	/**
	 * 客户端发送限制
	 */
    ClientLimit = "(climit)",
    /**
     * 页面名称
     */
    Name = "(name)",
    /**
     * Java使用的模块标识
     */
    ServerModule = "(smodule)",

    PbIndex = "(pbindex)",
}


const enum NSType {
    Null = 0,
    Boolean = 1,
    String = 2,
    ProtoBuf = 3,
    Bytes = 4,
    Double = 5,
    Int32 = 6,
    Uint32 = 7,
    Int64 = 8
}

const enum PBType {
    Double = 1,
    Float,
    Int64,
    UInt64,
    Int32,
    Fixed64,
    Fixed32,
    Bool,
    String,
    Group,
    Message,
    Bytes,
    Uint32,
    Enum,
    SFixed32,
    SFixed64,
    SInt32,
    SInt64
}

const type2number = {
    "double": PBType.Double,
    "float": PBType.Float,
    "int64": PBType.Int64,
    "uint64": PBType.UInt64,
    "int32": PBType.Int32,
    "fixed64": PBType.Fixed64,
    "fixed32": PBType.Fixed32,
    "bool": PBType.Bool,
    "string": PBType.String,
    "group": PBType.Group,
    "message": PBType.Message,
    "bytes": PBType.Bytes,
    "uint32": PBType.Uint32,
    "enum": PBType.Enum,
    "sfixed32": PBType.SFixed32,
    "sfixed64": PBType.SFixed64,
    "sint32": PBType.SInt32,
    "sint64": PBType.SInt64,

}

// google.protobuf.descriptor.proto
// enum Label {
// // 0 is reserved for errors
// LABEL_OPTIONAL      = 1;
// LABEL_REQUIRED      = 2;
// LABEL_REPEATED      = 3;
// // TODO(sanjay): Should we add LABEL_MAP?
// };

// protobuf.js
// // Field rules
// RULE: /^(?:required|optional|repeated|map)$/,
const rule2number = {
    "optional": 1,
    "required": 2,
    "repeated": 3
};

const enum MsgType {
    NotMessage = 0,
    isMsg = 0b1,
    isServerMsg = 0b10,

    isAllMsg = isMsg | isServerMsg
}

function field2type(field: ProtoBuf.ProtoField): [string, MsgType, string | number, boolean] {
    let type = field.type;
    let isMsg = MsgType.NotMessage;
    let ttype: string | number;
    switch (type) {
        case "int32":
        case "sint32":
        case "sfixed32":
            type = "number";
            ttype = NSType.Int32;
            break;
        case "enum":
        case "fixed32":
        case "uint32":
            type = "number";
            ttype = NSType.Uint32;

        case "double":
        case "float":
            type = "number";
            ttype = NSType.Double;
            break;
        case "bool":
            type = "boolean";
            ttype = NSType.Boolean;
            break;
        case "bytes":
            type = "ByteArray";
            ttype = NSType.Bytes;
            break;
        case "fixed64":
        case "sfixed64":
        case "int64":
        case "uint64":
        case "sint64":
            // 项目理论上不使用
            type = "number";
            ttype = NSType.Int64;
            break;
        case "message":
            type = field.type;
            isMsg = MsgType.isAllMsg;
            ttype = `"${type}"`;
            break;
        case "string":
            type = "string";
            ttype = NSType.String;
            break;
        default:
            type = field.type;
            isMsg = MsgType.isServerMsg;
            ttype = `"${type}"`;
            break;
    }
    if (field.rule == "repeated") { // 数组赋值
        return [type + "[]", isMsg, ttype, true];
    }
    return [type, isMsg, ttype, false];
}

const enum ConstString {
    ServiceName = "ServiceName",

    ServiceNameFile = "ServiceName.d.ts",

    PBDictFileName = "PBDict.ts",
    
    PBDictName = "PBDict",

    PBDictKeyName = "PBDictKey",

    PBCmdName = "CMD",
}

/**
 * 是否优化单消息
 */
var isOptMsg: boolean;