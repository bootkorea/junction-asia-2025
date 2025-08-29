import sys,os
import logging
from langchain_upstage import ChatUpstage, UpstageEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
sys.path.append(os.path.dirname(__file__))
from api_key import API_KEY


# Configure logging
logging.basicConfig(level=logging.INFO)


def create_rag_chain():
    """
    RAG 체인을 설정하고 생성하여 반환하는 함수
    """
    logging.info("--- Creating RAG chain... ---")

    # 1. API 키 설정
    UPSTAGE_API_KEY = API_KEY  # 실제 키를 사용하세요
    if not UPSTAGE_API_KEY or UPSTAGE_API_KEY == "YOUR_UPSTAGE_API_KEY":
        raise ValueError("UPSTAGE_API_KEY가 설정되지 않았습니다.")

    # 2. LLM 및 임베딩 모델 초기화
    chat = ChatUpstage(api_key=UPSTAGE_API_KEY, model="solar-pro2")
    embeddings = UpstageEmbeddings(
        api_key=UPSTAGE_API_KEY, model="solar-embedding-1-large")

    # 3. 문서 로드 및 벡터 DB 생성
    doc_folder_path = "/home/azureuser/flow/Wep/LLM/"
    doc_files = ["data.pdf", "safezone.pdf"]
    all_docs = []

    for file_name in doc_files:
        file_path = os.path.join(doc_folder_path, file_name)
        if os.path.exists(file_path):
            loader = PyPDFLoader(file_path)
            all_docs.extend(loader.load())
        else:
            logging.warning(f"경고: '{file_path}' 문서를 찾을 수 없습니다.")

    if not all_docs:
        raise FileNotFoundError("처리할 문서가 없습니다. PDF 파일이 있는지 확인하세요.")

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500, chunk_overlap=50)
    splits = text_splitter.split_documents(all_docs)
    vectorstore = FAISS.from_documents(documents=splits, embedding=embeddings)
    retriever = vectorstore.as_retriever()

    # 4. RAG 체인 설정
    template = """You are an emergency evacuation AI. The user is in an urgent fire situation and needs to know where to evacuate. Your response must be extremely direct. Provide ONLY the name of the safest shelter, landmark, or building. Do not offer any additional advice, instructions, or conversational text. Your answer must be a place name and nothing else. Infer the most appropriate shelter name from the context based on the user's location.

    **Context:**
    {context}

    **User's Question:**
    {question}

    **Answer:**
    """
    prompt = ChatPromptTemplate.from_template(template)

    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    rag_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | chat
        | StrOutputParser()
    )

    logging.info("--- RAG chain created successfully. ---")
    return rag_chain
