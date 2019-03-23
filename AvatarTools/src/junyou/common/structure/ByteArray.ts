module junyou {
	/**
	 * 方便后续调整
	 * 加入ProtoBuf的varint支持
	 * @author 3tion
	 *
	 */
	export class ByteArray extends egret.ByteArray {
		public constructor(buffer:ArrayBuffer=null) {
            super(buffer);
            //重置白鹭引擎的BUFFER_EXT_SIZE，白鹭用的是0，从0设置为512字节，减少一些碎片产生
            this["BUFFER_EXT_SIZE"] = 512;
		}
		
		/**
		 * 向字节流中写入64位的可变长度的整数(Protobuf)
		 */ 
        public writeVarint64(value: Int64): void {
            var high: number = value.high;
            var low: number = value.low;
            if(high == 0) {
                this.writeVarint(low)
            }
            else {
                for(var i: number = 0;i < 4;++i) {
                    this.writeByte((low & 0x7F) | 0x80)
                    low >>>= 7
                }
                if((high & (0xFFFFFFF << 3)) == 0) {
                    this.writeByte((high << 4) | low)
                }
                else {
                    this.writeByte((((high << 4) | low) & 0x7F) | 0x80)
                    this.writeVarint(high >>> 3)
                }
            }
        }
        
        /**
		 * 向字节流中写入32位的可变长度的整数(Protobuf)
		 */ 
        public writeVarint(value: number): void {
            for(;;) {
                if(value < 0x80) {
                    this.writeByte(value)
                    return;
                }
                else {
                    this.writeByte((value & 0x7F) | 0x80)
                    value >>>= 7
                }
            }
        }
        
        /**
         * 读取字节流中的32位变长整数(Protobuf)
         */ 
        public readVarint(): number {
            var result: number = 0
            for(var i: number = 0;;i += 7) {
                var b: number = this.readUnsignedByte()
                if(i < 32) {
                    if(b >= 0x80) {
                        result |= ((b & 0x7f) << i)
                    }
                    else {
                        result |= (b << i)
                        break
                    }
                }
                else {
                    while(this.readUnsignedByte() >= 0x80) {
                    }
                    break
                }
            }
            return result
        }

        /**
         * 读取字节流中的32位变长整数(Protobuf)
         */ 
        public readVarint64(): Int64 {
            var result = new Int64();
            var b: number
            var i: number = 0
            for(;;i += 7) {
                b = this.readUnsignedByte()
                if(i == 28) {
                    break
                }
                else {
                    if(b >= 0x80) {
                        result.low |= ((b & 0x7f) << i)
                    }
                    else {
                        result.low |= (b << i)
                        return result
                    }
                }
            }
            if(b >= 0x80) {
                b &= 0x7f
                result.low |= (b << i)
                result.high = b >>> 4
            }
            else {
                result.low |= (b << i)
                result.high = b >>> 4
                return result
            }
            for(i = 3;;i += 7) {
                b = this.readUnsignedByte()
                if(i < 32) {
                    if(b >= 0x80) {
                        result.high |= ((b & 0x7f) << i)
                    }
                    else {
                        result.high |= (b << i)
                        break
                    }
                }
            }
            return result
        }
	}
}
