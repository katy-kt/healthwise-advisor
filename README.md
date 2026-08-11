### 前置運作流程
lightrag build --> lightrag query
```
npm install
```
```
npm run dev
```
make sure to add .env.local in your project (under healthwise-advisor) 

.env.local裡面應該要長怎樣:
```
VITE_LLM_API_BASE_URL=/api
LLM_API_BASE_URL=http://127.0.0.1:2828
VITE_LLM_API_KEY=FAST_API_KEY 
```
FAST_API_KEY是.env裡的那個，自己替換
