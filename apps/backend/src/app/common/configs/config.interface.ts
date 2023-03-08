export interface Config {
    siteUrl: string
    database: DatabaseConfig;
    nest: NestConfig;
    cors: CorsConfig;
    mail: MailConfig;
    swagger: SwaggerConfig;
    graphql: GraphqlConfig;
    security: SecurityConfig;
}

export interface NestConfig {
    port: number;
}

interface DatabaseConfig {
    url: string;
}

export interface CorsConfig {
    enabled: boolean;
}

export interface SwaggerConfig {
    enabled: boolean;
    title: string;
    description: string;
    version: string;
    path: string;
}

export interface GraphqlConfig {
    playgroundEnabled: boolean;
    debug: boolean;
    schemaDestination: string;
    sortSchema: boolean;
}

export interface SecurityConfig {
    expiresIn: string;
    refreshIn: string;
    bcryptSaltOrRound: string | number;
}

export interface MailConfig {
    senderName: string;
    senderEmail: string;
}