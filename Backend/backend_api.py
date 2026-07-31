from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from google import genai

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = " "
client = genai.Client(api_key=API_KEY)

class RoastRequest(BaseModel):
    app_name: str
    minutes: int

@app.post("/generate-roast")
async def generate_roast(request: RoastRequest):
    try:
        prompt = f"""
Write exactly ONE single, brutally offensive sentence roasting someone for spending {minutes} minutes on {app_name}. 
Assume they are an engineering student who wastes half their day on a screen instead of studying or building their future.
RULES: 
- Return ONLY one single sentence. 
- NO bullet points. 
- NO introductory text like 'Here is a roast'. 
- NO quotation marks. 
- Be incredibly mean and condescending.
"""
        
        response = await client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        
        return {"status": "success", "roast": response.text}
    
    except Exception as e:
        print(f"API ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
