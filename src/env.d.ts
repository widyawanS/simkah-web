interface ImportMetaEnv {
    readonly ADMIN_USERNAME: string;
    readonly ADMIN_PASSWORD: string;
    readonly PROXY_LIST_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
