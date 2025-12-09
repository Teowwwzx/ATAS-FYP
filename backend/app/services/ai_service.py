import os
import json
from typing import Dict, Any, Optional
import requests


def _normalize_sections(sections: Optional[list[str]]) -> list[str]:
    default = ["title", "short_intro", "value_points", "logistics", "closing", "email_subjects"]
    if not sections:
        return default
    s = [x.strip().lower() for x in sections if isinstance(x, str) and x.strip()]
    # ensure required
    for req in default:
        if req not in s:
            s.append(req)
    return s


def _stub_generate(event: Dict[str, Any], expert: Optional[Dict[str, Any]], options: Dict[str, Any]) -> Dict[str, Any]:
    title = f"Proposal: {event.get('title') or 'Untitled Event'}"
    intro = (
        f"We propose a {getattr(event.get('format'), 'value', event.get('format','session'))} aligned with your audience. "
        f"Date: {event.get('start_datetime','TBD')} to {event.get('end_datetime','TBD')} ."
    )
    vp = [
        "Clear learning outcomes",
        "Interactive segments to boost engagement",
        "Real-world case studies",
    ]
    if expert and expert.get("tags"):
        vp.append(f"Expertise: {', '.join(expert['tags'])}")
    logistics = "We handle agenda, materials, and Q&A. AV and room setup as per standard."
    closing = "Happy to tailor this further to your goals."
    subs = [f"{event.get('title','Event')} proposal", "Session collaboration opportunity"]
    raw = "\n".join([title, intro, "- " + "\n- ".join(vp), logistics, closing])
    return {
        "title": title,
        "short_intro": intro,
        "value_points": vp,
        "logistics": logistics,
        "closing": closing,
        "email_subjects": subs,
        "raw_text": raw,
    }


from app.core.config import settings

def generate_proposal(event: Dict[str, Any], expert: Optional[Dict[str, Any]], options: Dict[str, Any]) -> Dict[str, Any]:
    # TESTING path or missing provider => stub
    if os.getenv("TESTING") == "1":
        return _stub_generate(event, expert, options)

    provider = settings.AI_PROVIDER.lower()
    
    # DEBUG LOGGING
    print(f"DEBUG: AI_PROVIDER={provider}")
    print(f"DEBUG: GEMINI_KEY={settings.GEMINI_API_KEY[:5]}...")
    print(f"DEBUG: GROQ_KEY={settings.GROQ_API_KEY[:5]}...")

    model = settings.AI_MODEL
    
    # Auto-fix model if user forgot to change it for Groq
    if provider == "groq":
        if "gemini" in model.lower() or "llama3-8b-8192" in model:
            print(f"DEBUG: Auto-switching incompatible model {model} to llama-3.3-70b-versatile for Groq")
            model = "llama-3.3-70b-versatile"

    print(f"DEBUG: Using Model={model}")

    timeout_ms = int(os.getenv("AI_TIMEOUT_MS", "12000"))
    sections = _normalize_sections(options.get("sections")) if isinstance(options, dict) else _normalize_sections(None)

    if provider == "stub":
        return _stub_generate(event, expert, options)

    prompt = {
        "role": "system",
        "content": (
            "You write concise outreach proposals for events. Return ONLY JSON with keys: "
            "title, short_intro, value_points (array), logistics, closing, email_subjects (array), raw_text."
        ),
    }
    user_content = {
        "event": event,
        "expert": expert or {},
        "sections": sections,
        "tone": options.get("tone"),
        "length_hint": options.get("length_hint"),
        "audience_level": options.get("audience_level"),
        "language": options.get("language"),
    }

    if provider == "groq":
        url = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }
        body = {
            "model": model,
            "messages": [prompt, {"role": "user", "content": json.dumps(user_content)}],
            "temperature": 0.7,
            "response_format": {"type": "json_object"},
        }
        try:
            r = requests.post(url, headers=headers, json=body, timeout=timeout_ms / 1000.0)
            r.raise_for_status()
            data = r.json()
            text = data["choices"][0]["message"]["content"]
            return json.loads(text)
        except Exception as e:
            print(f"DEBUG: Groq Error: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"DEBUG: Groq Response Body: {e.response.text}")
            return _stub_generate(event, expert, options)

    if provider == "ollama":
        url = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/generate")
        body = {
            "model": model,
            "prompt": (
                prompt["content"] + "\nUSER:\n" + json.dumps(user_content)
            ),
            "stream": False,
        }
        try:
            r = requests.post(url, json=body, timeout=timeout_ms / 1000.0)
            r.raise_for_status()
            data = r.json()
            text = data.get("response", "")
            return json.loads(text)
        except Exception:
            return _stub_generate(event, expert, options)

    if provider == "gemini":
        import google.generativeai as genai
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            return _stub_generate(event, expert, options)
        
        genai.configure(api_key=api_key)
        # using gemini-1.5-flash as requested (fast, small, free-tier eligible)
        model_name = settings.AI_MODEL or "gemini-1.5-flash"
        gemini_model = genai.GenerativeModel(model_name)

        prompt_text = (
            prompt["content"] + "\n" +
            "USER CONTEXT:\n" + json.dumps(user_content) + "\n" + 
            "IMPORTANT: JSON ONLY."
        )

        try:
            response = gemini_model.generate_content(
                prompt_text,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json"
                )
            )
            # Clean up potential markdown wrapping just in case
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            return json.loads(text)
        except Exception as e:
            print(f"Gemini Error: {e}")
            return _stub_generate(event, expert, options)

    return _stub_generate(event, expert, options)
