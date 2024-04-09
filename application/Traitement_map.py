from math import sqrt
def get_coords(line):
    """coordonnées des points d'intérêts"""
    coords = [0,0,0]
    pointeur = 0
    i = 0
    temp = ""
    while (pointeur <= 2 and i < len(line)):
        if line[i] == "-" or line[i] == "." and line[i+1].isdigit() or line[i].isdigit():
            temp += line[i]
        elif temp != "" and line[i] == " ":
            coords[pointeur] = float(temp)
            temp = ""
            pointeur += 1
        i += 1
    return coords

def get_coords_fa(line):
    """coorodonnées des zones interdites (areas)"""
    coords = [[0,0],[0,0],0]  #la 3e coord est la rotation
    compteur = 0
    i = 0
    temp = ""
    while (compteur <= 6 and i < len(line)):
        if line[i] == "-" or line[i] == "." and line[i+1].isdigit() or line[i].isdigit():
            temp += line[i]
        if temp != "" and line[i] == " " or i == len(line) -1:
            match compteur:
                case 2:
                    coords[2] = float(temp)
                case 3:
                    coords[0][0] = float(temp)
                case 4:
                    coords[0][1] = float(temp)
                case 5:
                    coords[1][0] = float(temp)
                case 6:
                    coords[1][1] = float(temp)
            temp = ""
            compteur += 1
        i += 1
    return coords

def get_coords_fl(line):
    """coordonnées des lignes interdites (lines)"""
    coords = [[0,0],[0,0]]
    compteur = 0
    i = 0
    temp = ""
    while (compteur <= 6 and i < len(line)):
        if line[i] == "-" or line[i] == "." and line[i+1].isdigit() or line[i].isdigit():
            temp += line[i]
        if temp != "" and line[i] == " " or i == len(line) -1:
            match compteur:
                case 3:
                    coords[0][0] = float(temp)
                case 4:
                    coords[0][1] = float(temp)
                case 5:
                    coords[1][0] = float(temp)
                case 6:
                    coords[1][1] = float(temp)
            temp = ""
            compteur += 1
        i += 1
    return coords

forbidden_lines = []
forbidden_areas = []
interest_points = []
def update_infos():
    file = open('map_loria.txt', 'r', encoding="utf8")
    for line in file:
        if (line[0:6] == "Cairn:"):
            if "ForbiddenLine" in line:
                forbidden_lines.append(get_coords_fl(line))
            elif "ForbiddenArea" in line:
                forbidden_areas.append(get_coords_fa(line))
            else:
                interest_points.append(get_coords(line))

update_infos()
print(forbidden_areas,"\n\n\n", forbidden_lines,"\n\n\n", interest_points)

def distance(a,b):
    return sqrt((b[0] - a[0])**2 + (b[1] - a[1])**2)

matrice_distances = [[0 for j in range(len(interest_points))] for i in range(len(interest_points))]
for i in range(len(interest_points)):
    for j in range(len(interest_points)):
        matrice_distances[i][j] = distance(interest_points[i], interest_points[j])