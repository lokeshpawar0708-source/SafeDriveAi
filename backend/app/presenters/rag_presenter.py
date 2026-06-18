import os
import time
from typing import TypedDict, List, Dict, Any
from dotenv import load_dotenv

# Load env variables
load_dotenv()

# Define the State for LangGraph workflow
class AgentState(TypedDict):
    query: str
    logs: List[Dict[str, Any]]
    context: str
    response: str

# Lazy-loaded local embeddings to speed up Flask boot time
_embeddings = None
def get_embeddings():
    global _embeddings
    if _embeddings is None:
        print("Loading local HuggingFace Embeddings model (all-MiniLM-L6-v2)...")
        from langchain_community.embeddings import HuggingFaceEmbeddings
        # Uses sentence-transformers internally
        _embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        print("Embeddings loaded successfully.")
    return _embeddings

# Node 1: Retrieve using MultiQuery RAG
def retrieve_logs_node(state: AgentState) -> Dict[str, Any]:
    from app.models.mongodb_logger import MongoDbLogger
    from langchain_core.documents import Document
    from langchain_core.vectorstores import InMemoryVectorStore
    
    query = state["query"]
    
    # 1. Fetch recent logs from MongoDB
    logs = MongoDbLogger.get_logs(limit=100)
    if not logs:
        return {
            "logs": [], 
            "context": "No alerts logged in the database yet. The driver has been safe and camera connection is online."
        }
    
    # 2. Convert to LangChain Documents
    documents = []
    for log in logs:
        content = f"[{log['time']}] Driver: {log['driver_id']} | Event: {log['event']} | Details: {log['details']}"
        documents.append(Document(page_content=content, metadata=log))
        
    try:
        # 3. Create temporary In-Memory Vector Store
        embeddings = get_embeddings()
        vectorstore = InMemoryVectorStore.from_documents(documents, embeddings)
        
        # 4. Check if Groq API key is configured
        api_key = os.getenv("GROQ_API_KEY", "")
        use_groq = api_key and api_key != "your_groq_api_key_here" and len(api_key.strip()) > 10
        
        if use_groq:
            from langchain_groq import ChatGroq
            from langchain.retrievers.multi_query import MultiQueryRetriever
            
            # Initialize ChatGroq LLM for multi-query generation
            llm = ChatGroq(
                groq_api_key=api_key,
                model_name="llama-3.3-70b-versatile",
                temperature=0.1
            )
            
            # Create MultiQuery Retriever (generates multiple queries and takes union of results)
            retriever = MultiQueryRetriever.from_llm(
                retriever=vectorstore.as_retriever(search_kwargs={"k": 5}),
                llm=llm
            )
            
            print(f"Executing MultiQuery retrieval for: '{query}'")
            retrieved_docs = retriever.invoke(query)
            
            # Combine retrieved contexts
            lines = [doc.page_content for doc in retrieved_docs]
            context = "\n".join(lines) if lines else "No matching incident records found in the retrieved context."
            return {"logs": logs, "context": context}
            
    except Exception as e:
        print(f"Vector search or MultiQuery setup failed: {e}. Falling back to keyword search.")
        
    # --- Local Keyword Matching Fallback (if no Groq Key or if loading fails) ---
    keywords = query.lower().split()
    matched_lines = []
    for log in logs:
        log_text = f"[{log['time']}] Event: {log['event']} | Details: {log['details']}".lower()
        if any(kw in log_text for kw in keywords if len(kw) > 2):
            matched_lines.append(f"[{log['time']}] Event: {log['event']} | Details: {log['details']}")
            
    if not matched_lines:
        # Fall back to returning all logs if no keyword matched
        matched_lines = [f"[{log['time']}] Event: {log['event']} | Details: {log['details']}" for log in logs[:10]]
        
    context = "\n".join(matched_lines)
    return {"logs": logs, "context": context}

# Node 2: Generate answer using Groq Chat (Llama 3)
def generate_answer_node(state: AgentState) -> Dict[str, Any]:
    from langchain_core.prompts import ChatPromptTemplate
    
    query = state["query"]
    context = state["context"]
    logs = state["logs"]
    
    api_key = os.getenv("GROQ_API_KEY", "")
    use_groq = api_key and api_key != "your_groq_api_key_here" and len(api_key.strip()) > 10
    
    if use_groq:
        try:
            from langchain_groq import ChatGroq
            
            llm = ChatGroq(
                groq_api_key=api_key,
                model_name="llama-3.3-70b-versatile",
                temperature=0.2
            )
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", (
                    "You are SafeDrive AI, an expert Driver Safety Assistant. "
                    "You are analyzing the driving session logs for a fleet manager. "
                    "Answer the manager's query precisely based ONLY on the provided session logs. "
                    "If the logs show the driver slept (Drowsiness events), state the exact times. "
                    "If the logs show the camera turned off or driver absent (Camera Status events), state when. "
                    "If the user asks in Hindi/Hinglish (like 'soya tha kya'), reply in a friendly mixed Hindi/English tone. "
                    "Provide a clean, bulleted summary if appropriate.\n\n"
                    "Driving Logs:\n{context}"
                )),
                ("human", "{query}")
            ])
            
            chain = prompt | llm
            res = chain.invoke({"context": context, "query": query})
            return {"response": res.content}
        except Exception as e:
            print(f"Groq LLM generation failed ({e}). Falling back to local semantic parser.")
            
    # --- Local Semantic Fallback Parser (Robust & Fast) ---
    response_text = ""
    query_lower = query.lower()
    
    drowsy_logs = [l for l in logs if "drowsiness" in l["event"].lower() or "sleep" in l["event"].lower()]
    distracted_logs = [l for l in logs if "distraction" in l["event"].lower() or "look" in l["event"].lower()]
    camera_logs = [l for l in logs if "camera" in l["event"].lower() or "absent" in l["details"].lower() or "disconnected" in l["details"].lower()]
    yawn_logs = [l for l in logs if "yawn" in l["event"].lower()]

    is_hindi = any(word in query_lower for word in ["soya", "khula", "baja", "kya", "hua", "kab", "sleep", "camera", "band", "alert"])

    if "soya" in query_lower or "sleep" in query_lower or "drowsy" in query_lower or "drowsiness" in query_lower:
        if drowsy_logs:
            times = ", ".join([f"**{l['time']}** ({l['details']})" for l in drowsy_logs])
            if is_hindi:
                response_text = f"Haan, driver drowsiness detect hui thi. Driver in samay par soya/drowsy tha: {times}."
            else:
                response_text = f"Yes, drowsiness was detected during the session. The driver showed drowsiness at: {times}."
        else:
            if is_hindi:
                response_text = "Nahi, iss session me driver ke sone ya drowsiness ka koi event detect nahi hua hai. Driver active tha."
            else:
                response_text = "No drowsiness or sleep events were detected in this session. The driver remained awake."

    elif "camera" in query_lower or "band" in query_lower or "off" in query_lower or "disconnected" in query_lower or "absent" in query_lower:
        if camera_logs:
            times = ", ".join([f"**{l['time']}** ({l['details']})" for l in camera_logs])
            if is_hindi:
                response_text = f"Haan, camera disconnect ya driver absent hone ke events mile hain: {times}."
            else:
                response_text = f"Yes, camera dropout or driver absence was recorded at: {times}."
        else:
            if is_hindi:
                response_text = "Nahi, camera band nahi hua tha. Pure session me camera feed properly chal rahi thi aur driver present tha."
            else:
                response_text = "No, the camera remained active and the driver was present throughout the entire session."

    elif "distract" in query_lower or "attention" in query_lower or "look" in query_lower:
        if distracted_logs:
            times = ", ".join([f"**{l['time']}** ({l['details']})" for l in distracted_logs])
            if is_hindi:
                response_text = f"Haan, driver distract hua tha aur sadak se dhyan hataya tha in timestamps par: {times}."
            else:
                response_text = f"Yes, the driver was distracted (looked away from the road) at: {times}."
        else:
            if is_hindi:
                response_text = "Nahi, driver focused tha. Sadak se attention hatne ka koi event logged nahi hai."
            else:
                response_text = "No distraction events were logged. The driver remained focused on the road."

    elif "yawn" in query_lower or "ubasi" in query_lower:
        if yawn_logs:
            if is_hindi:
                response_text = f"Driver ne iss session me kul **{len(yawn_logs)}** ubasi (yawn) li thi."
            else:
                response_text = f"The driver yawned **{len(yawn_logs)}** times during this session."
        else:
            if is_hindi:
                response_text = "Driver ne iss session me ek bhi yawn (ubasi) nahi li."
            else:
                response_text = "The driver did not yawn during this session."

    else:
        # General status query fallback
        summary_lines = []
        summary_lines.append("### SafeDrive AI Driver Summary Report (Fallback Mode)")
        summary_lines.append(f"- **Drowsiness Warnings**: {len(drowsy_logs)} times")
        summary_lines.append(f"- **Distraction Alerts**: {len(distracted_logs)} times")
        summary_lines.append(f"- **Yawning Counts**: {len(yawn_logs)} times")
        summary_lines.append(f"- **Camera Disconnects**: {len(camera_logs)} times")
        summary_lines.append("\n*Note: Please configure a valid `GROQ_API_KEY` in the `.env` file to chat freely with the AI!*")
        response_text = "\n".join(summary_lines)
        
    return {"response": response_text}

# Build the LangGraph State Machine
def build_rag_graph():
    from langgraph.graph import StateGraph, END
    
    # Initialize the graph with State definition
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("retrieve", retrieve_logs_node)
    workflow.add_node("generate", generate_answer_node)
    
    # Set entry point
    workflow.set_entry_point("retrieve")
    
    # Set sequential edge flow
    workflow.add_edge("retrieve", "generate")
    workflow.add_edge("generate", END)
    
    # Compile the graph workflow
    return workflow.compile()

# Compile the final RAG runnable application
rag_agent_app = build_rag_graph()

class RagPresenter:
    @staticmethod
    def ask_safety_assistant(query: str) -> Dict[str, Any]:
        try:
            inputs = {"query": query, "logs": [], "context": "", "response": ""}
            output = rag_agent_app.invoke(inputs)
            return {
                "response": output.get("response", "Could not process request."),
                "context": output.get("context", "")
            }
        except Exception as e:
            print(f"Error executing RAG LangGraph workflow: {e}")
            return {
                "response": f"RAG Error: {e}",
                "context": ""
            }
