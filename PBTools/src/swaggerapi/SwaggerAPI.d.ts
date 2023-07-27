
export interface SwaggerAPI {
    openapi: string;
    info: Info;
    servers: Server[];
    paths: Paths;
    components: Components;
}

export interface Components {
    schemas: Schemas;
}

export interface Schemas {
    [key: string]: Schema;

}
export interface Schema {
    type: string;
    properties: Properties;

    required?: string[];

    ref?: string;

    name?: string;
    label?: string;
}

export interface Properties {
    [name: string]: Property;
}
export interface Ref {
    $ref: string;
}
export interface Property {
    $ref?: string;
    type: Type;

    format?: Format;

    items?: Ref;
}

export const enum Format {
    Int32 = "int32",
    Int64 = "int64",
}

export const enum Type {
    Boolean = "boolean",
    String = "string",
    Integer = "integer",
    Array = "array",
}


export interface Info {
    title: string;
    version: string;
}

export interface Paths {
    [path: string]: Path;
}

export interface Path {
    post: Post;
}

export interface Post {
    tags: string[];
    summary: string;
    operationId: string;
    requestBody: RequestBody;
    responses: Responses;
}

export interface RequestBody {
    content: RequestBodyContent;
    required: boolean;
}

export interface RequestBodyContent {
    "application/json": ApplicationJSON;
}

export interface ApplicationJSON {
    schema: Ref;
}

export interface Responses {
    "200": The200;
}

export interface The200 {
    description: string;
    content: The200_Content;
}

export interface The200_Content {
    "*/*": ApplicationJSON;
}

export interface Server {
    url: string;
    description: string;
}
