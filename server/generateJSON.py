import random

places = [
    "LD/Lynx DockTarget2", "LD/Lynx DockTarget1", "DockingStation2", "DockingStation1", 
    "Standby1", "S-106", "S-104-2", "S-105", "S-104-1", "Custom Responses", 
    "Queuing Manager", "S-102", "Station LD/Lynx2", "Station LD/Lynx1", "Poste_2", 
    "Cell-LRmate", "LRMate", "S-108", "SFP-1", "S-111-2", "S-111-1", "Sfp_Poste4", 
    "MagAuto", "S-112-2", "S-112", "S-114", "S-115"
]

id_mapping = {place: idx for idx, place in enumerate(places)}

size = len(places)

def generate_random_matrix(size, max, flag, round_val):
    return [[0 if (i == j and flag) else round(random.random()*max, round_val) for j in range(size)] for i in range(size)]

times_matrix = generate_random_matrix(size, 5, True, 2)
successes_matrix = generate_random_matrix(size, 20, False, 0)
fails_matrix = generate_random_matrix(size, 20, True, 0)


indent = "  "

times_matrix_string = '[\n'+2*indent+(',\n'+2*indent).join('['+', '.join(map(str, row))+']' for row in times_matrix)+'\n'+indent+']'
successes_matrix_string = '[\n'+2*indent+(',\n'+2*indent).join('['+', '.join(map(str, row))+']' for row in successes_matrix)+'\n'+indent+']'
fails_matrix_string = '[\n'+2*indent+(',\n'+2*indent).join('['+', '.join(map(str, row))+']' for row in fails_matrix)+'\n'+indent+']'
id_mapping_string = '{\n' + 2*indent + (',\n'+2*indent).join(f'"{place}": {index}' for place, index in id_mapping.items()) + '\n'+indent+'}'


json_str = f'{{\n"id":\n{indent+id_mapping_string},\n\n"times":\n{indent+times_matrix_string},\n\n"successes":\n{indent+successes_matrix_string},\n\n"fails":\n{indent+fails_matrix_string}\n}}'

with open('data.json', 'w') as json_file:
    json_file.write(json_str)

