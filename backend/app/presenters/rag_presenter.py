import os
import time
from typing import TypedDict, List, Dict, Any
from dotenv import load_dotenv

# Load env variables explicitly from backend/.env
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path=ENV_PATH)

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
    
    query = state["query"]
    
    # 1. Fetch recent logs from MongoDB
    logs = MongoDbLogger.get_logs(limit=100)
    if not logs:
        return {
            "logs": [], 
            "context": "No alerts logged in the database yet. The driver has been safe and camera connection is online."
        }
    
    # Check if Groq API key is configured
    api_key = os.getenv("GROQ_API_KEY", "")
    use_groq = api_key and api_key != "your_groq_api_key_here" and len(api_key.strip()) > 10
    
    # Bypass local HuggingFace embeddings download (which can hang/fail on slow connections)
    # and feed the logs directly into context for the LLM. Llama 3 has a huge context window,
    # so this is faster, more robust, and 100% accurate.
    if use_groq:
        lines = [f"[{log['time']}] Driver: {log['driver_id']} | Event: {log['event']} | Details: {log['details']}" for log in logs]
        context = "\n".join(lines)
        return {"logs": logs, "context": context}
        
    # --- Local Keyword Matching Fallback (if no Groq Key) ---
    keywords = query.lower().split()
    matched_lines = []
    for log in logs:
        log_text = f"[{log['time']}] Event: {log['event']} | Details: {log['details']}".lower()
        if any(kw in log_text for kw in keywords if len(kw) > 2):
            matched_lines.append(f"[{log['time']}] Event: {log['event']} | Details: {log['details']}")
            
    if not matched_lines:
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
    
    groq_error = None
    if use_groq:
        try:
            from langchain_groq import ChatGroq
            
            llm = ChatGroq(
                groq_api_key=api_key,
                model_name="llama-3.3-70b-versatile",  # Active and recommended 70B model on Groq
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
            groq_error = str(e)
            
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
        if not use_groq:
            summary_lines.append("\n*Note: Please configure a valid `GROQ_API_KEY` in the `.env` file to chat freely with the AI!*")
        response_text = "\n".join(summary_lines)
        
    if groq_error:
        response_text = f"*⚠️ Groq API Error: {groq_error} (using local safety assistant fallback)*\n\n" + response_text
        
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
