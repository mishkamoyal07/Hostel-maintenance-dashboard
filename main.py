# ==========================================================================
# AI Hostel Maintenance Prioritization Dashboard - Python FastAPI Backend
# Runs a FastAPI web server with SQLite persistence, NLP classifier,
# priority recalculation algorithm, and technician load balancer.
# ==========================================================================

import os
import sqlite3
import json
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="AI Hostel Maintenance Dashboard API", version="1.2")

# Database File Path
DB_FILE = "hostel_maintenance.db"

# --- DB Helper Functions ---
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create Tickets Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room TEXT NOT NULL,
            category TEXT NOT NULL,
            student_urgency TEXT NOT NULL,
            description TEXT NOT NULL,
            age REAL NOT NULL,
            status TEXT NOT NULL,
            assigned_tech INTEGER,
            safety_raw INTEGER NOT NULL,
            disruption_raw INTEGER NOT NULL,
            cost_raw INTEGER NOT NULL,
            detected_keywords TEXT NOT NULL,
            photo_url TEXT
        )
    """)
    
    # Create Technicians Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS technicians (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            specialty TEXT NOT NULL
        )
    """)
    
    # Create Configuration Table for Weights
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS weights_config (
            key TEXT PRIMARY KEY,
            val INTEGER NOT NULL
        )
    """)
    
    conn.commit()
    
    # Seed Technicians if empty
    cursor.execute("SELECT COUNT(*) FROM technicians")
    if cursor.fetchone()[0] == 0:
        tech_data = [
            ("Mario Rossi", "Plumbing"),
            ("Nikola Tesla", "Electrical"),
            ("Kelvin Boyle", "HVAC"),
            ("Tommy Carpenter", "Furniture"),
            ("Sanitizer Sam", "Cleaning"),
            ("Sherlock Lock", "Security")
        ]
        cursor.executemany("INSERT INTO technicians (name, specialty) VALUES (?, ?)", tech_data)
        conn.commit()
        
    # Seed Weights if empty
    cursor.execute("SELECT COUNT(*) FROM weights_config")
    if cursor.fetchone()[0] == 0:
        weights = [
            ("safety", 40),
            ("disruption", 30),
            ("age", 20),
            ("cost", 10)
        ]
        cursor.executemany("INSERT INTO weights_config (key, val) VALUES (?, ?)", weights)
        conn.commit()
        
    # Seed Initial Tickets if empty
    cursor.execute("SELECT COUNT(*) FROM tickets")
    if cursor.fetchone()[0] == 0:
        initial_tickets = [
            (
                "A-304", "Plumbing", "High", 
                "Main sewer line pipe burst in washroom, water flooding the corridor rapidly and leaking into the room.",
                0.5, "Pending", None, 90, 95, 30, json.dumps(["burst", "flooding", "washroom", "leaking"]), None
            ),
            (
                "B-112", "Electrical", "High", 
                "Exposed live wires sparking near the study table wall socket. Danger of shock when wall is touched.",
                1.2, "Pending", None, 98, 85, 80, json.dumps(["exposed", "wires", "sparking", "danger", "shock"]), None
            ),
            (
                "A-102", "HVAC", "Medium", 
                "AC unit blowing hot air during afternoon heat wave. Room temperature is exceeding 38 degrees.",
                3.5, "Scheduled", 3, 60, 80, 45, json.dumps(["ac", "hot air", "heat wave", "temperature"]), None
            ),
            (
                "C-405", "Security", "High", 
                "Main entrance door lock is jammed. Resident is locked outside their room and cannot access study materials.",
                0.8, "Pending", None, 75, 90, 85, json.dumps(["lock", "jammed", "locked outside"]), None
            ),
            (
                "B-203", "Furniture", "Low", 
                "Common room study table wooden chair leg is loose and unstable. Squeaks loudly when used.",
                24.0, "Pending", None, 20, 30, 95, json.dumps(["chair", "leg", "unstable", "squeaks"]), None
            ),
            (
                "A-202", "HVAC", "Medium", 
                "Water heater in common washroom is not warming. Showers are freezing cold.",
                12.0, "Scheduled", 3, 40, 70, 65, json.dumps(["heater", "not warming", "freezing cold"]), None
            ),
            (
                "C-101", "Cleaning", "Medium", 
                "Heavy grease build-up and cockroach infestation reported near main kitchen trash area.",
                18.0, "In Progress", 5, 55, 65, 90, json.dumps(["cockroach", "infestation", "grease"]), None
            ),
            (
                "B-310", "Security", "High", 
                "Window glass pane shattered after storm. Sharp glass shards lying inside the room on study desk.",
                2.5, "Pending", None, 82, 50, 70, json.dumps(["shattered", "glass shards", "window"]), None
            ),
            (
                "A-412", "Electrical", "Low", 
                "Ceiling fan speed regulator knob is missing. Fan only runs at maximum speed.",
                48.0, "Resolved", None, 30, 40, 95, json.dumps(["knob", "missing", "regulator"]), None
            ),
            (
                "C-302", "Plumbing", "Medium", 
                "Clogged shower drain resulting in standing dirty water during use.",
                6.0, "Pending", None, 50, 60, 85, json.dumps(["clogged", "drain", "standing water"]), None
            )
        ]
        cursor.executemany("""
            INSERT INTO tickets (
                room, category, student_urgency, description, age, status, assigned_tech, 
                safety_raw, disruption_raw, cost_raw, detected_keywords, photo_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, initial_tickets)
        conn.commit()
        
    conn.close()

# Initialize Database on launch
init_db()

# --- NLP Keyword Rules for Server Side ---
NLP_KEYWORD_RULES = [
    {
        "keywords": ['spark', 'wire', 'shock', 'fire', 'smoke', 'burning', 'electricity', 'circuit', 'blackout', 'power out'],
        "category": 'Electrical',
        "safetyBoost": 95,
        "disruptionBoost": 85,
        "costScore": 80
    },
    {
        "keywords": ['flood', 'burst', 'overflow', 'gush', 'pour', 'leak', 'drain', 'clog', 'sewer', 'pipe', 'water'],
        "category": 'Plumbing',
        "safetyBoost": 75,
        "disruptionBoost": 90,
        "costScore": 50
    },
    {
        "keywords": ['intruder', 'lock', 'stolen', 'theft', 'break-in', 'jammed door', 'key lost', 'keycard', 'stranger'],
        "category": 'Security',
        "safetyBoost": 85,
        "disruptionBoost": 80,
        "costScore": 85
    },
    {
        "keywords": ['freezing', 'heater', 'hot water', 'ac', 'cooler', 'ventilation', 'choke', 'smell gas', 'thermostat'],
        "category": 'HVAC',
        "safetyBoost": 70,
        "disruptionBoost": 75,
        "costScore": 40
    },
    {
        "keywords": ['bed', 'table', 'chair', 'desk', 'wardrobe', 'cabinet', 'hinge', 'broken leg', 'loose screw'],
        "category": 'Furniture',
        "safetyBoost": 25,
        "disruptionBoost": 40,
        "costScore": 90
    },
    {
        "keywords": ['cockroach', 'rat', 'rodent', 'bug', 'ant', 'cleaning', 'stench', 'dirty', 'infestation', 'garbage', 'trash'],
        "category": 'Cleaning',
        "safetyBoost": 50,
        "disruptionBoost": 60,
        "costScore": 95
    }
]

def analyze_ticket_text(desc: str, urgency: str):
    desc_lower = desc.lower()
    detected_category = "Unassigned"
    safety_score = 20
    disruption_score = 30
    cost_score = 80
    found_keywords = []
    
    for rule in NLP_KEYWORD_RULES:
        match_count = 0
        for keyword in rule["keywords"]:
            if keyword in desc_lower:
                match_count += 1
                if keyword not in found_keywords:
                    found_keywords.append(keyword)
        
        if match_count > 0:
            detected_category = rule["category"]
            safety_score = max(safety_score, rule["safetyBoost"])
            disruption_score = max(disruption_score, rule["disruptionBoost"])
            cost_score = min(cost_score, rule["costScore"])
            
    # Adjust scores based on perceived student urgency
    if urgency == "High":
        safety_score = min(safety_score + 10, 100)
        disruption_score = min(disruption_score + 15, 100)
    elif urgency == "Low":
        safety_score = max(safety_score - 10, 10)
        disruption_score = max(disruption_score - 15, 10)
        
    return detected_category, safety_score, disruption_score, cost_score, found_keywords

# --- Priority Recalculator Engine ---
def get_weights_dict(cursor):
    cursor.execute("SELECT key, val FROM weights_config")
    rows = cursor.fetchall()
    return {r["key"]: r["val"] for r in rows}

def calculate_priority_score(ticket, weights):
    w_safety = weights.get("safety", 40)
    w_disruption = weights.get("disruption", 30)
    w_age = weights.get("age", 20)
    w_cost = weights.get("cost", 10)
    total_w = w_safety + w_disruption + w_age + w_cost
    
    if total_w == 0:
        return 0
        
    # Normalize age (max 48 hours for 100%)
    age_val = float(ticket["age"])
    age_factor = min((age_val / 48.0) * 100.0, 100.0)
    
    weighted_sum = (
        (int(ticket["safety_raw"]) * w_safety) +
        (int(ticket["disruption_raw"]) * w_disruption) +
        (age_factor * w_age) +
        (int(ticket["cost_raw"]) * w_cost)
    )
    
    return int(round(weighted_sum / total_w))

# --- API Models ---
class TicketCreate(BaseModel):
    room: str
    category: str
    studentUrgency: str
    description: str
    photoUrl: Optional[str] = None
    detectedKeywords: Optional[List[str]] = None
    safetyRaw: Optional[int] = None
    disruptionRaw: Optional[int] = None

class AssignRequest(BaseModel):
    techId: int

class WeightsUpdate(BaseModel):
    safety: int
    disruption: int
    age: int
    cost: int

# --- API Routes ---

@app.get("/api/weights")
def get_weights():
    conn = get_db_connection()
    cursor = conn.cursor()
    weights = get_weights_dict(cursor)
    conn.close()
    return weights

@app.post("/api/weights")
def update_weights(w: WeightsUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE weights_config SET val = ? WHERE key = 'safety'", (w.safety,))
    cursor.execute("UPDATE weights_config SET val = ? WHERE key = 'disruption'", (w.disruption,))
    cursor.execute("UPDATE weights_config SET val = ? WHERE key = 'age'", (w.age,))
    cursor.execute("UPDATE weights_config SET val = ? WHERE key = 'cost'", (w.cost,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Weights updated successfully"}

@app.get("/api/tickets")
def get_tickets():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Load weights
    weights = get_weights_dict(cursor)
    
    # Load tickets
    cursor.execute("SELECT * FROM tickets")
    rows = cursor.fetchall()
    
    tickets_list = []
    for row in rows:
        ticket = dict(row)
        ticket["detectedKeywords"] = json.loads(ticket["detected_keywords"])
        ticket["assignedTech"] = ticket["assigned_tech"]
        
        # Calculate dynamic priority score on-the-fly based on current weights
        ticket["priorityScore"] = calculate_priority_score(ticket, weights)
        tickets_list.append(ticket)
        
    conn.close()
    
    # Sort: Resolved tickets go to bottom, others sorted by priorityScore descending
    tickets_list.sort(key=lambda t: (t["status"] == "Resolved", -t["priorityScore"]))
    return tickets_list

@app.post("/api/tickets")
def create_ticket(ticket: TicketCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Run NLP classifier on server side to identify category and scores
    nlp_cat, nlp_safety, nlp_disrupt, nlp_cost, keywords = analyze_ticket_text(ticket.description, ticket.studentUrgency)
    
    # Use NLP outcomes unless frontend explicitly overrides them (e.g. from mock OCR)
    final_cat = ticket.category if ticket.category != "Unassigned" else nlp_cat
    final_safety = ticket.safetyRaw if ticket.safetyRaw is not None else nlp_safety
    final_disrupt = ticket.disruptionRaw if ticket.disruptionRaw is not None else nlp_disrupt
    
    # Merge frontend keywords with NLP keywords
    final_keywords = ticket.detectedKeywords if ticket.detectedKeywords else keywords
    
    cursor.execute("""
        INSERT INTO tickets (
            room, category, student_urgency, description, age, status, assigned_tech,
            safety_raw, disruption_raw, cost_raw, detected_keywords, photo_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        ticket.room,
        final_cat,
        ticket.studentUrgency,
        ticket.description,
        0.01, # fresh
        "Pending",
        None,
        final_safety,
        final_disrupt,
        nlp_cost,
        json.dumps(final_keywords),
        ticket.photoUrl
    ))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    
    return {"status": "success", "ticketId": new_id, "message": "Ticket created successfully"}

@app.post("/api/tickets/{ticket_id}/assign")
def assign_ticket(ticket_id: int, req: AssignRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify ticket
    cursor.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,))
    ticket = cursor.fetchone()
    if not ticket:
        conn.close()
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    # Verify technician
    cursor.execute("SELECT * FROM technicians WHERE id = ?", (req.techId,))
    tech = cursor.fetchone()
    if not tech:
        conn.close()
        raise HTTPException(status_code=404, detail="Technician not found")
        
    cursor.execute("UPDATE tickets SET assigned_tech = ?, status = 'Scheduled' WHERE id = ?", (req.techId, ticket_id))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Ticket assigned to {tech['name']}"}

@app.post("/api/tickets/{ticket_id}/resolve")
def resolve_ticket(ticket_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,))
    ticket = cursor.fetchone()
    if not ticket:
        conn.close()
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    cursor.execute("UPDATE tickets SET assigned_tech = NULL, status = 'Resolved' WHERE id = ?", (ticket_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Ticket resolved"}

@app.get("/api/technicians")
def get_technicians():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM technicians")
    tech_rows = cursor.fetchall()
    
    techs_list = []
    for row in tech_rows:
        tech = dict(row)
        # Calculate active tasks count in real-time
        cursor.execute("SELECT COUNT(*) FROM tickets WHERE assigned_tech = ? AND status != 'Resolved'", (tech["id"],))
        tech["activeTasks"] = cursor.fetchone()[0]
        techs_list.append(tech)
        
    conn.close()
    return techs_list

@app.post("/api/smart-assign")
def smart_assign():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Fetch all pending tickets
    cursor.execute("SELECT * FROM tickets WHERE status = 'Pending'")
    pending = cursor.fetchall()
    
    if not pending:
        conn.close()
        return {"status": "success", "assignedCount": 0, "message": "No pending tickets in queue."}
        
    assigned_count = 0
    assigned_logs = []
    
    for row in pending:
        ticket = dict(row)
        category = ticket["category"]
        
        # Find technicians matching the ticket category
        cursor.execute("SELECT * FROM technicians WHERE specialty = ?", (category,))
        candidates = cursor.fetchall()
        if not candidates:
            continue
            
        # Select candidate with lowest active tasks
        best_candidate = None
        min_load = 999
        
        for cand in candidates:
            cursor.execute("SELECT COUNT(*) FROM tickets WHERE assigned_tech = ? AND status != 'Resolved'", (cand["id"],))
            load = cursor.fetchone()[0]
            if load < min_load:
                min_load = load
                best_candidate = cand
                
        # Assign if candidate exists and is not overloaded
        if best_candidate and min_load < 4:
            cursor.execute("UPDATE tickets SET assigned_tech = ?, status = 'Scheduled' WHERE id = ?", (best_candidate["id"], ticket["id"]))
            conn.commit()
            assigned_count += 1
            assigned_logs.append(f"Smart-assigned ticket #{ticket['id']} to {best_candidate['name']}.")
            
    conn.close()
    return {
        "status": "success", 
        "assignedCount": assigned_count, 
        "message": f"Successfully assigned {assigned_count} tickets.",
        "logs": assigned_logs
    }

# --- Serve Static UI Files ---

@app.get("/")
def read_root():
    return FileResponse("index.html")

@app.get("/style.css")
def read_css():
    return FileResponse("style.css")

@app.get("/app.js")
def read_js():
    return FileResponse("app.js")

# --- Run Server script ---
if __name__ == "__main__":
    import uvicorn
    # Create the database and seed tables if launching directly
    init_db()
    print("AI Hostels database initialized.")
    print("Starting FastAPI dashboard server at http://localhost:8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
