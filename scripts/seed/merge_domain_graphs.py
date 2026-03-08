import json
import os

# Domains and basic order of processing
DOMAINS = [
    "arithmetic", 
    "algebra", 
    "geometry", 
    "trigonometry", 
    "probability_stats", 
    "logic_discrete", 
    "calculus"
]

CROSS_EDGES = [
    # Explicit cross-domain dependencies as requested
    {"from": "arith_add_subtract_fractions_unlike_den", "to": "alg_one_step_equations_add_sub"}, # fractions -> algebra expressions/equations
    {"from": "arith_equivalent_fractions", "to": "alg_variables_constants_terms"}, # fractions -> algebra
    {"from": "alg_multi_step_linear_equations", "to": "geom_skill_1"}, # algebra equations -> geometry 
    {"from": "alg_coordinate_plane_foundations", "to": "geom_skill_5"}, # coordinate plane -> geometry
    {"from": "geom_skill_15", "to": "trig_skill_1"}, # triangles (geometry) -> trigonometric ratios
    {"from": "alg_quadratic_functions", "to": "calc_skill_1"}, # algebra functions indirectly to calculus
    {"from": "logic_skill_10", "to": "prob_skill_1"}, # combinatorics/logic -> probability
]

# Difficulty progression map constraint:
# 1–3 → arithmetic foundations
# 3–5 → fractions, ratios, intro algebra
# 5–7 → equations, systems, geometry reasoning
# 7–9 → quadratics, functions, trigonometry
# 9–10 → calculus and advanced topics
def clamp_difficulty(domain, diff):
    if domain == "arithmetic":
        return max(1, min(diff, 5))
    elif domain == "algebra":
        return max(3, min(diff, 8))
    elif domain == "geometry":
        return max(5, min(diff, 7))
    elif domain == "trigonometry":
        return max(7, min(diff, 9))
    elif domain == "logic_discrete":
        return max(6, min(diff, 8))
    elif domain == "probability_stats":
        return max(5, min(diff, 8))
    elif domain == "calculus":
        return max(9, min(diff, 10))
    return diff

def main():
    base_dir = r"c:\Users\Usuario\mathlingo\scripts\seed"
    
    all_skills = []
    all_edges = []
    
    # 1. Load everything
    for domain in DOMAINS:
        skills_file = os.path.join(base_dir, f"skills_graph_{domain}.json")
        edges_file = os.path.join(base_dir, f"skill_edges_{domain}.json")
        
        with open(skills_file, "r") as f:
            data = json.load(f)
            for skill in data.get("skills", []):
                # Enforce difficulty clamping
                skill["difficulty_level"] = clamp_difficulty(domain, skill.get("difficulty_level", 1))
                all_skills.append(skill)
                
        with open(edges_file, "r") as f:
            data = json.load(f)
            for edge in data.get("edges", []):
                all_edges.append(edge)

    # 2. Add cross edges
    all_edges.extend(CROSS_EDGES)
    
    # Validation: node ID existence mapping
    skill_ids = set([s["id"] for s in all_skills])
    
    # 3. Restrict incoming edges to max 3
    # Group edges by 'to'
    incoming_map = {}
    validated_edges = []
    
    for edge in all_edges:
        src = edge["from"]
        dst = edge["to"]
        
        # Verify both exist
        if src not in skill_ids or dst not in skill_ids:
            # Skip invalid edges (e.g. if we map to something that doesn't exist)
            continue
            
        if dst not in incoming_map:
            incoming_map[dst] = []
            
        if len(incoming_map[dst]) < 3:
            incoming_map[dst].append(src)
            validated_edges.append(edge)

    # 4. Cycle detection (Topological Sort)
    adj_list = {sid: [] for sid in skill_ids}
    for e in validated_edges:
        adj_list[e["from"]].append(e["to"])
        
    visited = {} # False = unvisited, True = visiting, 2 = visited
    has_cycle = False
    
    def dfs(node):
        nonlocal has_cycle
        if visited.get(node) == 1:
            has_cycle = True
            return
        if visited.get(node) == 2:
            return
            
        visited[node] = 1
        for neighbor in adj_list.get(node, []):
            dfs(neighbor)
        visited[node] = 2

    for node in skill_ids:
        if node not in visited:
            dfs(node)
            
    if has_cycle:
        print("WARNING: Cycle detected in graph! DAG constraint violated.")
    else:
        print(f"Graph is a valid DAG. Total skills: {len(all_skills)}, Total edges: {len(validated_edges)}")
    
    # 5. Export JSONs
    with open(os.path.join(base_dir, "math_skills_graph.json"), "w") as f:
        json.dump({"skills": all_skills}, f, indent=2)
        
    with open(os.path.join(base_dir, "math_skill_edges.json"), "w") as f:
        json.dump({"edges": validated_edges}, f, indent=2)

    # 6. Export SQLs
    with open(os.path.join(base_dir, "skills_seed.sql"), "w") as f:
        f.write("INSERT INTO math_skills (id, name, description, domain, difficulty_level, mastery_threshold, xp_reward) VALUES\n")
        values = []
        for s in all_skills:
            desc = s.get("description", "").replace("'", "''")
            name = s.get("name", "").replace("'", "''")
            values.append(f"('{s['id']}', '{name}', '{desc}', '{s['domain']}', {s['difficulty_level']}, {s['mastery_threshold']}, {s['xp_reward']})")
        f.write(",\n".join(values) + ";\n")
        
    with open(os.path.join(base_dir, "skill_edges_seed.sql"), "w") as f:
        f.write("INSERT INTO math_skill_edges (prerequisite_id, skill_id) VALUES\n")
        values = []
        for e in validated_edges:
             values.append(f"('{e['from']}', '{e['to']}')")
        f.write(",\n".join(values) + ";\n")

if __name__ == "__main__":
    main()
