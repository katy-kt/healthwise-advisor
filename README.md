### 前置運作流程
qdrant testbed --> lightrag query
qdrant testbed跑一次就好
之後每次開啟前端系統都直接run lightrag query即可。
```
npm install
```
```
npm run dev
```
make sure to add .env.local in your project (under healthwise-advisor) 

.env.local裡面應該要長怎樣:
```
LLM_API_BASE_URL=http://127.0.0.1:2828
LLM_API_KEY=FAST_API_KEY
```
`LLM_API_KEY` 只由後端讀取，不會送進瀏覽器。`LLM_API_BASE_URL` 必須指向提供 OpenAI 相容 `/v1/chat/completions` 的服務；若上游不需要 API key，可以省略 `LLM_API_KEY`。

舊版的 `VITE_LLM_API_KEY` 仍可暫時相容，但不建議使用；正式環境請改用 `LLM_API_KEY`。
