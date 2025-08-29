# server.py
from LLM import llmrag
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware  # 추가
from pydantic import BaseModel
import uvicorn
import sys, os
from typing import List, Dict
from contextlib import asynccontextmanager

sys.path.append(os.path.dirname(os.path.abspath(os.path.dirname(__file__))))
from CSV_Converter import csv_convert as con

# 1단계에서 수정한 llmrag 모듈에서 RAG 체인 생성 함수를 임포트

# RAG 체인을 저장할 전역 변수
rag_chain = None
# # 서버 시작 시 모델을 로드하기 위한 lifespan 관리자
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     global rag_chain
#     print("서버 시작: RAG 모델을 로드합니다...")
#     # 서버가 시작될 때 단 한번만 RAG 체인을 생성
#     rag_chain = llmrag.create_rag_chain()
#     print("RAG 모델 로드 완료.")
#     yield
#     print("서버 종료.")

# FastAPI 앱 생성
app = FastAPI(title="Azure VM FastAPI Server")

# --------------------------
# CORS 설정
# --------------------------
origins = [
    "http://localhost:3000",  # React 개발 서버
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # 허용할 도메인
    allow_credentials=True,
    allow_methods=["*"],    # GET, POST 등 모든 메서드 허용
    allow_headers=["*"],    # 모든 헤더 허용
)

# --------------------------
# POST 엔드포인트 정의
# --------------------------


@app.post("/process")
@app.get("/process") 
def process_request():
    """
    요청을 기반으로 run_script 실행 후, 관측 + 예측 데이터를 반환
    """
    result: List[Dict] = con.run_script()  # run_script() 호출, 리스트 반환
    return {"status": "success", "data": result}


# 요청 본문을 위한 Pydantic 모델 정의
class Query(BaseModel):
    question: str
	
@app.post("/llm")
async def process_request(query: Query):
    """
    사용자의 질문을 받아 RAG 모델의 답변과 run_script 결과를 함께 반환
    """
    if not rag_chain:
        raise HTTPException(status_code=503, detail="모델이 아직 준비되지 않았습니다.")

    # 2. RAG 모델 호출하여 답변 생성
    try:
        rag_answer = await rag_chain.ainvoke(query.question)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG 모델 호출 중 오류: {e}")

    # 3. 두 결과를 통합하여 반환
    return {
        "status": "success",
        "rag_answer": rag_answer,
    }


# 서버 실행
if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
