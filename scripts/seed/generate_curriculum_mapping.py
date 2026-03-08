import json
import math

def get_grade_ranges(grade):
    # Grade level to difficulty mapping
    if grade in (5, 6): return 1, 3
    if grade in (7, 8): return 3, 6
    if grade in (9, 10): return 6, 8
    if grade in (11, 12): return 8, 10
    return 1, 10

def build_slots():
    slots = []
    global_idx = 0
    for grade in range(5, 13):
        min_d, max_d = get_grade_ranges(grade)
        for bim in range(1, 5):
            for unit in range(1, 5):
                for lesson in range(1, 5):
                    slots.append({
                        "global_idx": global_idx,
                        "grade": grade, "bimester": bim, "unit": unit, "lesson": lesson,
                        "min_d": min_d, "max_d": max_d
                    })
                    global_idx += 1
    return slots

def get_target_diff(slot):
    # Determine the position of this slot within its grade band (0 to 127)
    g_idx = slot["grade"]
    if g_idx in (5, 6): base_g = 5
    elif g_idx in (7, 8): base_g = 7
    elif g_idx in (9, 10): base_g = 9
    else: base_g = 11
    
    idx_in_band = (g_idx - base_g) * 64 + (slot["bimester"] - 1) * 16 + (slot["unit"] - 1) * 4 + (slot["lesson"] - 1)
    fract = idx_in_band / 127.0
    return slot["min_d"] + (slot["max_d"] - slot["min_d"]) * fract

def main():
    with open('math_skills_graph.json', 'r') as f:
        skills_data = json.load(f)["skills"]
    with open('math_skill_edges.json', 'r') as f:
        edges_data = json.load(f)["edges"]

    skills = {s["id"]: s for s in skills_data}
    prereqs = {s["id"]: set() for s in skills_data}
    
    for e in edges_data:
        prereqs[e["to"]].add(e["from"])

    # Precalculate depth
    depth = {s["id"]: 0 for s in skills_data}
    changed = True
    while changed:
        changed = False
        for s in skills_data:
            sid = s["id"]
            if prereqs[sid]:
                max_p_depth = max([depth[p] for p in prereqs[sid]])
                if max_p_depth + 1 > depth[sid]:
                    depth[sid] = max_p_depth + 1
                    changed = True

    placed_in_lesson = {}
    times_placed = {s["id"]: 0 for s in skills_data}
    
    slots = build_slots()
    lesson_skill_map = []
    
    # Track the last difficulty placed within a unit to avoid jumps
    last_diff = None
    last_unit_marker = None
    
    for slot in slots:
        # Reset last_diff if we entered a new unit
        current_unit_marker = (slot["grade"], slot["bimester"], slot["unit"])
        if current_unit_marker != last_unit_marker:
            last_unit_marker = current_unit_marker
            last_diff = None
            
        target_d = get_target_diff(slot)
        
        # Valid candidates:
        # prereqs completely satisfied strictly before current slot
        valid_skills = []
        for sid in skills:
            d = skills[sid]["difficulty_level"]
            
            # For review skills, check if they are broadly in the valid range for this grade (+- 1 to be lenient for spaces)
            # For new skills, they MUST be strictly within [min_d, max_d]
            is_strict = (times_placed[sid] == 0)
            if is_strict:
                if d > slot["max_d"]: # Prevent introducing skills that are too hard
                    continue
            else:
                if not (slot["min_d"] - 1 <= d <= slot["max_d"] + 1):
                    continue
                
            can_place = True
            for p in prereqs[sid]:
                if times_placed[p] == 0 or placed_in_lesson[p] >= slot["global_idx"]:
                    can_place = False
                    break
            
            # Cannot place if already hit 6
            if times_placed[sid] >= 6:
                can_place = False
                
            if can_place:
                valid_skills.append(sid)

        new_candidates = [s for s in valid_skills if times_placed[s] == 0]
        review_candidates = [s for s in valid_skills if 0 < times_placed[s] < 6]
        
        # Sort new candidates: 
        # 1. Easiest first (prevents leaving them behind)
        # 2. Priority topological depth
        new_candidates.sort(key=lambda s: (skills[s]["difficulty_level"], depth[s]))
        
        chosen = []
        # We can pick up to 2 new skills if we are falling behind
        for n in new_candidates:
            if len(chosen) >= 2: break
            if len(chosen) == 1 and len(new_candidates) < 15: break
            chosen.append(n)
            
        if chosen:
            # Recalculate last_diff average to guide review selection smoothly
            last_diff = sum(skills[x]["difficulty_level"] for x in chosen) / len(chosen)
            
        # Review candidates sorting
        def review_penalty(sid):
            diff = skills[sid]["difficulty_level"]
            dist = abs(diff - (last_diff if last_diff else target_d))
            # Heavily prioritize those with times_placed < 2 to ensure we hit the floor!
            needs_review_urgency = -100 if times_placed[sid] < 2 else times_placed[sid]
            return needs_review_urgency, dist

        review_candidates.sort(key=review_penalty)
        
        # We can pick up to 2 review skills, so max 3 total
        for r in review_candidates:
            if len(chosen) >= 3:
                break
            if r not in chosen:
                chosen.append(r)
                if last_diff is None:
                    last_diff = skills[r]["difficulty_level"]
                else:
                    last_diff = (last_diff + skills[r]["difficulty_level"]) / 2 # average for jump tracking
                    
        # Update trackers
        for s in chosen:
            if times_placed[s] == 0:
                placed_in_lesson[s] = slot["global_idx"]
            times_placed[s] += 1
            
        lesson_skill_map.append({
             "grade": slot["grade"],
             "bimester": slot["bimester"],
             "unit": slot["unit"],
             "lesson": slot["lesson"],
             "skills": chosen
        })

    # VERIFICATION
    import sys
    errors = []
    
    # 1. Max 3 skills per lesson
    if any(len(l["skills"]) > 3 for l in lesson_skill_map):
        errors.append("Constraint failed: some lesson has >3 skills.")
        
    # 2. All 355 included + Prereqs earlier (guaranteed by placement logic) + each 2-6 times
    unplaced = [s for s, t in times_placed.items() if t == 0]
    if unplaced:
        errors.append(f"Constraint failed: {len(unplaced)} skills never placed! Example: {unplaced[:3]}")
    
    underplaced = [s for s, t in times_placed.items() if 1 <= t < 2]
    if underplaced:
        errors.append(f"Constraint failed: {len(underplaced)} skills placed less than 2 times!")
        
    overplaced = [s for s, t in times_placed.items() if t > 6]
    if overplaced:
        errors.append(f"Constraint failed: {len(overplaced)} skills placed more than 6 times!")
        
    if errors:
        for e in errors: print(e)
        # Attempt to debug unplaced
        for u in unplaced[:3]:
            print(f"Debug unplaced: {u}, diff={skills[u]['difficulty_level']}, prereqs={[p for p in prereqs[u]]}")
            for p in prereqs[u]:
                print(f"  prereq {p} placed: {times_placed[p]}")
        sys.exit(1)
        
    print("Verification Passed! All constraints met.")
    print(f"Total slots: {len(lesson_skill_map)}")
    frequencies = list(times_placed.values())
    print(f"Skill frequencies - Min: {min(frequencies)}, Max: {max(frequencies)}")

    # Outputs
    with open('lesson_skill_map_seed.json', 'w') as f:
        json.dump({"lesson_skill_map": lesson_skill_map}, f, indent=2)
        
    with open('lesson_skill_map_seed.sql', 'w') as f:
        f.write("INSERT INTO lesson_skill_map (grade, bimester, unit, lesson, skill_id) VALUES\n")
        vals = []
        for l in lesson_skill_map:
            for s in l["skills"]:
                vals.append(f"({l['grade']}, {l['bimester']}, {l['unit']}, {l['lesson']}, '{s}')")
        f.write(",\n".join(vals) + ";\n")

if __name__ == "__main__":
    main()
