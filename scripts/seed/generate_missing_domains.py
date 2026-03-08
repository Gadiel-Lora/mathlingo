import json
import os

# Definitions of domains that need to be generated 
# (arithmetic and algebra already exist)
DOMAINS_TO_GENERATE = {
    "geometry": {"count": 45, "diff_min": 4, "diff_max": 7},
    "trigonometry": {"count": 30, "diff_min": 7, "diff_max": 9},
    "probability_stats": {"count": 35, "diff_min": 5, "diff_max": 8},
    "calculus": {"count": 35, "diff_min": 9, "diff_max": 10},
    "logic_discrete": {"count": 30, "diff_min": 6, "diff_max": 8}
}

# Simple prefixes for IDs
PREFIXES = {
    "geometry": "geom_",
    "trigonometry": "trig_",
    "probability_stats": "prob_",
    "calculus": "calc_",
    "logic_discrete": "logic_"
}

def generate_domains(base_dir):
    for domain, config in DOMAINS_TO_GENERATE.items():
        count = config["count"]
        d_min = config["diff_min"]
        d_max = config["diff_max"]
        prefix = PREFIXES[domain]
        
        skills = []
        edges = []
        
        for i in range(1, count + 1):
            # Gradual difficulty
            ratio = i / count
            difficulty = round(d_min + (d_max - d_min) * ratio)
            
            skill_id = f"{prefix}skill_{i}"
            name = f"{domain.replace('_', ' ').title()} Skill {i}"
            
            skills.append({
                "id": skill_id,
                "name": name,
                "description": f"Understanding {name.lower()}",
                "domain": domain,
                "difficulty_level": difficulty,
                "mastery_threshold": 70 + int(ratio * 10),
                "xp_reward": 10 + difficulty * 2
            })
            
            # Simple linear dependency with max 2 previous items occasionally branching
            if i > 1:
                # Add a primary linear edge
                edges.append({
                    "from": f"{prefix}skill_{i-1}",
                    "to": skill_id
                })
                # Occasionally add a secondary edge
                if i > 3 and i % 3 == 0:
                    edges.append({
                        "from": f"{prefix}skill_{i-2}",
                        "to": skill_id
                    })
                    
        # Write skills to disk
        skills_file = os.path.join(base_dir, f"skills_graph_{domain}.json")
        with open(skills_file, "w") as f:
            json.dump({"skills": skills}, f, indent=2)
            
        # Write edges to disk
        edges_file = os.path.join(base_dir, f"skill_edges_{domain}.json")
        with open(edges_file, "w") as f:
            json.dump({"edges": edges}, f, indent=2)
            
        print(f"Generated {domain}: {len(skills)} skills, {len(edges)} edges")

if __name__ == "__main__":
    base_dir = r"c:\Users\Usuario\mathlingo\scripts\seed"
    generate_domains(base_dir)
