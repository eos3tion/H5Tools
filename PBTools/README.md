## 网络协议说明
1. 字节流使用 LittleEndian 编码
2. 协议标识(后文使用`cmd`表示) 2字节 `int16` 类型 范围 -32768~32767
3. 数据长度(后文使用`byteLen`标识）2字节 `uint16` 类型 范围 0 ~ 65535
4. 根据`cmd`对应表，找到`cmd`对应的数据类型  
    1. 数据类型为数值类型参见上表
        
         常量值 | 说明 | 数据占用字节 |
         --- | --- | --- |
         0 | null 空值 | 0 |
         1 | boolean 布尔类型 | 1 |
         2 | string 字符串 | byteLen |
         3 | protobuf 类型 | byteLen |
         4 | bytes 字节数组 | byteLen |
         5 | double 双精度浮点类型 | 8 |
         6 | int32 单精度整形 | 4 |
         7 | uint32 单精度无符号整形 | 4 | 

    2. 数据为字符串类型：
        字符串则对应protobuf消息类型标识，byteLen字节长度的 `protobuf` 流


## 代码生成工具配置
![image](http://192.168.0.205:1234/hqgH5/wiki/uploads/d8c66045d214e4c71d4c1da16a524d72/image.png)
红框中，ServiceName和PB消息字典，需填基于项目source路径**带文件名的相对路径**，如上图所示  
客户端、服务端 项目根目录 是指 **源码根目录**

## wiki上`protobuf`内容的写法
使用下面的区块进行包装
>\`\`\`protobuf  
>//消息写这里  
>\`\`\`

## 命令的区段定义
1. 常规指令区段如下
客户端C2S指令区段  10000以下  
服务端S2C指令区段  为客户端区段+10000  
比如 A模块   区段是  110-139  
客户端C2S就是  110 - 139  
服务端S2C是   10110 - 10139  

2. 处理成功和处理失败的 S2C如果数据结构不一样，就定多个指令

3. 如果一次定多个指令，指令区间流出一定空位(Padding)  
比如：  **`指令A`**
```
     A_C2S  cmd 为 100  
     ASuccess_S2C cmd 为 10100  
     AFailed_S2C cmd 为 10101  
```
**`指令B`**  留出一定空位
```
     B_C2S  cmd 为 105  
     BSuccess_S2C cmd 为 10105  
     BFailed_S2C cmd 为 10106  
```
     这样可以防止客户端指令和服务端指令  区段相差太远  
     同时，如果要在`指令A`和`指令B`中间插入`指令C`，也能有足够的区段进行插入

     
## 如何定义前后端命令
1.  数据格式符合protobuf 2的语法标准
  * 由于使用javascript作为客户端，所以数据类型请使用`int32、double、string、bool、message、enum`
  * 避免使用int64这些`javascript`没有原生支持的数据类型
2. message的类型
  * 普通消息：没有任何后缀，不包含`option (cmd) = 123;`类似这样的指令，此类消息作为子消息的数据结构使用
  * S2C后缀的消息：此类消息代表 server to client，即服务端向客户端发送的消息，需要包含自定义标签(cmd)，如：`option (cmd) = 123;`，最终会在服务端代码中生成 send方法，在客户端代码中生成 recieve的回调代码
  * C2S后缀的消息：此类消息代表 client to server，即客户端向服务端发送的消息，需要包含自定义标签(cmd)，如：`option (cmd) = 123;`，最终会在客户端代码中生成 send方法，在服务端代码中生成 recieve的回调代码
3.  自定义的标签(option)  

| 标签 | 说明 | 适用范围 |
| --- | --- | --- |
| cmodule | 客户端模块，自动生成代码时，客户端会使用此模块命名进行生成 | 页面全局或者message中 |
| smodule | 服务的模块 |  有S2C或者C2S并且有(cmd)的message中 |
| cpath | 客户端代码生成路径，会拼接项目路径组成客户端代码生成的完整路径 | 页面全局或者message中 |
| service | 如果有S2C或者C2S后缀的消息，会自动生成业务分发代码(Service)，此标签用于指定服务的类名 | 页面全局 |
| java | 配置Java要生成的文件名 | 页面全局 |
| cmd | S2C或者C2S中消息使用的协议编号 | 有S2C或者C2S的message中 |
| climit | C2S中消息发送的时间限制，发送一次请求后，至少间隔此时间，才可以发送第二次请求 | C2S的message中 |

## enum枚举定义
`1.同一页中定义(枚举类和引用字段在同一页中)`


枚举类![image](http://192.168.0.205:1234/hqgH5/wiki/uploads/752e4ea9ebe09dabc54cf9d86be04980/image.png)
引用字段![image](http://192.168.0.205:1234/hqgH5/wiki/uploads/3de0f274977a349684cd1e342dcfeca4/image.png)
生成代码：
枚举类![image](http://192.168.0.205:1234/hqgH5/wiki/uploads/6c808dde1f29fe99f4855df949d3f734/image.png)引用字段![image](http://192.168.0.205:1234/hqgH5/wiki/uploads/9c6b306e7f9c483bb9e0bc71a4a9960a/image.png)PBMsgDict![image](http://192.168.0.205:1234/hqgH5/wiki/uploads/4cf5f532c25b78bca67f26f7f2e280e0/image.png)

`2.公共数据定义(枚举类定义在公共数据而引用字段定义在其他指令页)`

wiki中写法：
枚举类的类名使用`E_`作为前缀  
公共页面：
```protobuf
enum E_XXState{
      stateA=1;//状态A
      stateB=2;//状态B
}
```
消息定义页面：
```protobuf
message Msg{
    required int32 id=1;//标识
    required E_XXState state=2;//状态
}
```

自动生成通信代码Msg和Service代码  
## Service中，用于手写代码的标注
### $area1 class上方的手写代码
```java
/*-*begin $area1*-*/
// 这里用于手写在class上方的代码
/*-*end $area1*-*/

class XXX{
}
```

### $onRegister class上方的手写代码
```java
class XXX{
    onRegister() {
        super.onRegister();
	    //...
	    //自动生成的代码
	    //...
	
        /*-*begin $onRegister*-*/
        // 这里用于手写在class上方的代码
        /*-*end $onRegister*-*/
    }
}
```

### $area2 class里面的手写代码
```java
class XXX{
//...
//自动生成的代码
//...

/*-*begin $area2*-*/
// 这里用于手写在class上方的代码
/*-*end $area2*-*/

}
```

### $area3 class里面的手写代码
```java
class XXX{
//...
//自动生成的代码
//...

}

/*-*begin $area3*-*/
// 这里用于手写在class上方的代码
/*-*end $area3*-*/
```

### recieve方法体中的手写代码
```java
protected handler(data: NetData) {
		let msg: XXX = <XXX>data.data;
		/*-*begin handler*-*/
		//这里是手写代码
		/*-*end handler*-*/
	}
```