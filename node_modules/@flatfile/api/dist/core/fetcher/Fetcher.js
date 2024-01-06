"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetcher = void 0;
const axios_1 = __importDefault(require("axios"));
const qs_1 = __importDefault(require("qs"));
const INITIAL_RETRY_DELAY = 1;
const MAX_RETRY_DELAY = 60;
const DEFAULT_MAX_RETRIES = 2;
function fetcherImpl(args) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const headers = {};
        if (args.body !== undefined && args.contentType != null) {
            headers["Content-Type"] = args.contentType;
        }
        if (args.headers != null) {
            for (const [key, value] of Object.entries(args.headers)) {
                if (value != null) {
                    headers[key] = value;
                }
            }
        }
        const makeRequest = () => __awaiter(this, void 0, void 0, function* () {
            var _d;
            return yield (0, axios_1.default)({
                url: args.url,
                params: args.queryParameters,
                paramsSerializer: (params) => {
                    return qs_1.default.stringify(params, { arrayFormat: "repeat" });
                },
                method: args.method,
                headers,
                data: args.body,
                validateStatus: () => true,
                transformResponse: (response) => response,
                timeout: args.timeoutMs,
                transitional: {
                    clarifyTimeoutError: true,
                },
                withCredentials: args.withCredentials,
                adapter: args.adapter,
                onUploadProgress: args.onUploadProgress,
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                responseType: (_d = args.responseType) !== null && _d !== void 0 ? _d : "json",
            });
        });
        try {
            let response = yield makeRequest();
            for (let i = 0; i < ((_a = args.maxRetries) !== null && _a !== void 0 ? _a : DEFAULT_MAX_RETRIES); ++i) {
                if (response.status === 408 ||
                    response.status === 409 ||
                    response.status === 429 ||
                    response.status >= 500) {
                    const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(i, 2), MAX_RETRY_DELAY);
                    yield new Promise((resolve) => setTimeout(resolve, delay));
                    response = yield makeRequest();
                }
                else {
                    break;
                }
            }
            let body;
            if (args.responseType === "blob") {
                body = response.data;
            }
            else if (response.data != null && response.data.length > 0) {
                try {
                    body = (_b = JSON.parse(response.data)) !== null && _b !== void 0 ? _b : undefined;
                }
                catch (_c) {
                    return {
                        ok: false,
                        error: {
                            reason: "non-json",
                            statusCode: response.status,
                            rawBody: response.data,
                        },
                    };
                }
            }
            if (response.status >= 200 && response.status < 400) {
                return {
                    ok: true,
                    body: body,
                };
            }
            else {
                return {
                    ok: false,
                    error: {
                        reason: "status-code",
                        statusCode: response.status,
                        body,
                    },
                };
            }
        }
        catch (error) {
            if (error.code === "ETIMEDOUT") {
                return {
                    ok: false,
                    error: {
                        reason: "timeout",
                    },
                };
            }
            return {
                ok: false,
                error: {
                    reason: "unknown",
                    errorMessage: error.message,
                },
            };
        }
    });
}
exports.fetcher = fetcherImpl;
