"""
Seed catalogue of Indian destinations (all 28 states and 8 union territories).

HONEST STATUS: this is a hand-curated SEED list written from general knowledge. It has NOT been verified
against official sources. It deliberately contains NO opening hours, ticket prices or ritual details,
because those must come from official sources. Coordinates are approximate (2 decimals).
It is a starting point: add thousands more rows with `python -m app.tools.import_places your.csv`.

Line format:  id | Name | State code | tags (comma) | lat | lng | best season | one-line summary
"""
from __future__ import annotations

STATES = {
    "AP": ("Andhra Pradesh", "state"), "AR": ("Arunachal Pradesh", "state"), "AS": ("Assam", "state"),
    "BR": ("Bihar", "state"), "CG": ("Chhattisgarh", "state"), "GA": ("Goa", "state"),
    "GJ": ("Gujarat", "state"), "HR": ("Haryana", "state"), "HP": ("Himachal Pradesh", "state"),
    "JH": ("Jharkhand", "state"), "KA": ("Karnataka", "state"), "KL": ("Kerala", "state"),
    "MP": ("Madhya Pradesh", "state"), "MH": ("Maharashtra", "state"), "MN": ("Manipur", "state"),
    "ML": ("Meghalaya", "state"), "MZ": ("Mizoram", "state"), "NL": ("Nagaland", "state"),
    "OD": ("Odisha", "state"), "PB": ("Punjab", "state"), "RJ": ("Rajasthan", "state"),
    "SK": ("Sikkim", "state"), "TN": ("Tamil Nadu", "state"), "TS": ("Telangana", "state"),
    "TR": ("Tripura", "state"), "UP": ("Uttar Pradesh", "state"), "UK": ("Uttarakhand", "state"),
    "WB": ("West Bengal", "state"),
    "AN": ("Andaman and Nicobar Islands", "ut"), "CH": ("Chandigarh", "ut"),
    "DD": ("Dadra and Nagar Haveli and Daman and Diu", "ut"), "DL": ("Delhi", "ut"),
    "JK": ("Jammu and Kashmir", "ut"), "LA": ("Ladakh", "ut"), "LD": ("Lakshadweep", "ut"),
    "PY": ("Puducherry", "ut"),
}

TAGS = {  # tag -> label (used for filters and category tiles)
    "temple": "Temples and pilgrimage", "wildlife": "Forests and wildlife", "beach": "Beaches",
    "hills": "Hill stations", "heritage": "Historical monuments", "waterfall": "Waterfalls",
    "lake": "Lakes and wetlands", "river": "Rivers and rafting", "desert": "Deserts", "fort": "Forts and palaces", "cave": "Caves",
    "island": "Islands", "adventure": "Adventure", "trekking": "Trekking", "food": "Food tourism",
    "wellness": "Wellness and yoga", "culture": "Culture and festivals", "city": "Cities and museums",
    "offbeat": "Hidden gems", "backwaters": "Backwaters", "snow": "Snow and skiing",
    "honeymoon": "Romantic", "family": "Family friendly", "weekend": "Weekend getaways", "budget": "Budget friendly",
}

_RAW = """
hyderabad|Hyderabad|TS|city,heritage,food,weekend,family|17.38|78.48|Oct-Mar|City of Charminar, Golconda and legendary biryani.
charminar|Charminar|TS|heritage,city,food|17.36|78.47|Oct-Mar|16th century monument surrounded by bustling bazaars.
golconda-fort|Golconda Fort|TS|fort,heritage,weekend|17.38|78.40|Oct-Mar|Hilltop fort of the Qutb Shahi dynasty near Hyderabad.
warangal-fort|Warangal Fort|TS|fort,heritage|17.95|79.58|Oct-Mar|Kakatiya era fort with ornate stone gateways.
ramappa-temple|Ramappa Temple|TS|temple,heritage,offbeat|18.26|79.94|Oct-Mar|13th century Kakatiya temple, a UNESCO World Heritage Site.
yadadri|Yadadri Temple|TS|temple,weekend|17.59|78.95|Oct-Mar|Hill shrine to Lakshmi Narasimha near Hyderabad.
bhadrachalam|Bhadrachalam|TS|temple,lake|17.67|80.89|Oct-Mar|Godavari riverside Rama temple town.
kawal-tiger-reserve|Kawal Tiger Reserve|TS|wildlife,offbeat|19.00|78.95|Nov-Jun|Teak forests and grasslands in northern Telangana.
amrabad-tiger-reserve|Amrabad Tiger Reserve|TS|wildlife,offbeat|16.35|78.85|Nov-Jun|Forest reserve in the Nallamala hills near Srisailam.
tirupati|Tirumala Tirupati|AP|temple,hills,family|13.68|79.35|Sep-Feb|One of India's most visited hill temples; plan darshan early.
srisailam|Srisailam|AP|temple,wildlife,lake|16.07|78.87|Oct-Feb|Jyotirlinga and Shakti Peetha shrine above the Krishna river.
araku-valley|Araku Valley|AP|hills,waterfall,offbeat,honeymoon,weekend|18.33|82.88|Oct-Feb|Coffee-covered hills and waterfalls in the Eastern Ghats.
rushikonda|Rushikonda Beach|AP|beach,weekend|17.78|83.38|Oct-Mar|Long Visakhapatnam beach popular for water sports.
yarada|Yarada Beach|AP|beach,offbeat|17.65|83.27|Oct-Mar|Quiet beach backed by hills near Visakhapatnam.
lambasingi|Lambasingi|AP|hills,offbeat,weekend|17.87|82.50|Nov-Feb|Cool hill village sometimes called the Kashmir of Andhra.
horsley-hills|Horsley Hills|AP|hills,weekend|13.66|78.40|Oct-Feb|Hill retreat in the Chittoor district with forest views.
papikonda|Papikonda National Park|AP|wildlife,lake,adventure|17.40|81.55|Oct-Feb|Godavari gorge forests, usually seen on boat trips.
belum-caves|Belum Caves|AP|cave,offbeat|15.10|78.11|Oct-Feb|One of the longest cave systems on the Indian subcontinent.
gandikota|Gandikota|AP|offbeat,adventure,weekend|14.81|78.28|Oct-Feb|River canyon often called the Grand Canyon of India.
tawang|Tawang|AR|temple,hills,snow,offbeat|27.59|91.86|Mar-Oct|High mountain town known for its large monastery.
namdapha|Namdapha National Park|AR|wildlife,trekking,offbeat|27.49|96.39|Nov-Mar|Remote rainforest park in the eastern Himalaya.
ziro-valley|Ziro Valley|AR|offbeat,culture,hills|27.55|93.83|Mar-Oct|Terraced paddy valley and home of the Apatani people.
bomdila|Bomdila|AR|hills,temple,offbeat|27.26|92.41|Mar-Oct|Mountain town on the road to Tawang.
kaziranga|Kaziranga National Park|AS|wildlife,family|26.58|93.17|Nov-Apr|Grasslands famous for one-horned rhinoceros.
kamakhya|Kamakhya Temple|AS|temple|26.17|91.71|Oct-Mar|Shakti Peetha on Nilachal Hill in Guwahati.
majuli|Majuli|AS|island,culture,offbeat|26.95|94.17|Oct-Mar|Large river island with Vaishnav monasteries.
bodh-gaya|Bodh Gaya|BR|temple,heritage|24.70|84.99|Oct-Mar|Site of the Buddha's enlightenment, a UNESCO World Heritage Site.
nalanda|Nalanda|BR|heritage|25.14|85.44|Oct-Mar|Ruins of an ancient Buddhist university.
rajgir|Rajgir|BR|heritage,hills,temple|25.03|85.42|Oct-Mar|Ancient hill town with Buddhist and Jain sites.
chitrakote-falls|Chitrakote Falls|CG|waterfall,offbeat|19.21|81.70|Jul-Oct|Wide horseshoe waterfall on the Indravati river.
kanger-valley|Kanger Valley National Park|CG|wildlife,cave,trekking,offbeat|18.88|81.93|Oct-Jun|Forest park with limestone caves in Bastar.
goa|Goa|GA|beach,food,honeymoon,family,weekend|15.50|73.83|Nov-Feb|Beaches, Portuguese heritage and seafood.
baga|Baga Beach|GA|beach,adventure|15.56|73.75|Nov-Feb|Lively North Goa beach with water sports and shacks.
calangute|Calangute Beach|GA|beach,family|15.54|73.76|Nov-Feb|Wide, busy beach in North Goa.
anjuna|Anjuna Beach|GA|beach,culture|15.57|73.74|Nov-Feb|Cliff-backed beach with flea markets.
vagator|Vagator Beach|GA|beach,fort|15.60|73.74|Nov-Feb|Red-cliff beach near Chapora Fort.
palolem|Palolem Beach|GA|beach,honeymoon,offbeat|15.01|74.02|Nov-Feb|Crescent beach in South Goa.
agonda|Agonda Beach|GA|beach,offbeat,honeymoon|15.05|73.99|Nov-Feb|Calmer, quieter beach in South Goa.
bom-jesus|Basilica of Bom Jesus|GA|temple,heritage|15.50|73.91|Nov-Feb|Baroque church in Old Goa, a UNESCO World Heritage Site.
somnath|Somnath Temple|GJ|temple,beach|20.89|70.40|Oct-Mar|Jyotirlinga shrine on the Arabian Sea coast.
dwarka|Dwarkadhish Temple|GJ|temple,beach|22.24|68.97|Oct-Mar|Krishna temple in one of the Char Dham towns.
gir|Gir National Park|GJ|wildlife,family|21.12|70.82|Dec-Mar|Home of the Asiatic lion.
kutch|Kutch (Rann of Kutch)|GJ|desert,culture,offbeat,heritage|23.73|69.86|Nov-Feb|White salt desert, craft villages and the Rann Utsav season.
rani-ki-vav|Rani ki Vav|GJ|heritage,offbeat|23.86|72.10|Oct-Mar|Intricately carved stepwell in Patan, a UNESCO World Heritage Site.
statue-of-unity|Statue of Unity|GJ|city,family,weekend|21.84|73.72|Oct-Mar|World's tallest statue on the Narmada river.
kurukshetra|Kurukshetra|HR|temple,heritage|29.97|76.84|Oct-Mar|Mahabharata-linked pilgrimage and heritage town.
morni-hills|Morni Hills|HR|hills,trekking,offbeat,weekend|30.70|77.08|Oct-Mar|Small hill region near Chandigarh with forest trails.
shimla|Shimla|HP|hills,family,honeymoon|31.10|77.17|Mar-Jun, Dec-Jan|Colonial-era hill station and former summer capital.
manali|Manali|HP|hills,snow,adventure,honeymoon|32.24|77.19|Mar-Jun, Dec-Feb|Himalayan valley for snow, rivers and adventure sports.
dharamshala|Dharamshala|HP|hills,culture,trekking,temple|32.22|76.32|Mar-Jun, Sep-Nov|Home of the Tibetan community in exile, with Dhauladhar views.
dalhousie|Dalhousie|HP|hills,family,offbeat|32.54|75.97|Mar-Jun, Sep-Nov|Quiet colonial hill town with pine forests.
spiti-valley|Spiti Valley|HP|hills,adventure,offbeat,temple|32.25|78.02|Jun-Oct|High-altitude cold desert valley with monasteries.
great-himalayan-np|Great Himalayan National Park|HP|wildlife,trekking,offbeat|31.74|77.45|Apr-Jun, Sep-Nov|UNESCO listed Himalayan park with trekking routes.
deoghar|Baidyanath Dham, Deoghar|JH|temple|24.49|86.70|Oct-Mar|Jyotirlinga pilgrimage town.
netarhat|Netarhat|JH|hills,offbeat|23.48|84.27|Oct-Mar|Hill station known for sunrise and sunset views.
hundru-falls|Hundru Falls|JH|waterfall,offbeat|23.45|85.60|Jul-Dec|Tall waterfall near Ranchi.
hampi|Hampi|KA|heritage,temple,offbeat,adventure|15.34|76.46|Oct-Feb|UNESCO ruins of the Vijayanagara empire among boulder landscapes.
badami|Badami|KA|heritage,cave,temple|15.92|75.68|Oct-Feb|Rock-cut cave temples of the Chalukya dynasty.
pattadakal|Pattadakal|KA|heritage,temple|15.95|75.82|Oct-Feb|UNESCO listed group of Chalukya temples.
mysore-palace|Mysore Palace|KA|fort,heritage,city,family|12.31|76.65|Oct-Mar|Grand royal palace in Mysuru.
coorg|Coorg (Kodagu)|KA|hills,waterfall,offbeat,honeymoon|12.42|75.74|Oct-Mar|Coffee plantations, waterfalls and misty ghats.
chikmagalur|Chikmagalur|KA|hills,trekking,weekend|13.32|75.77|Oct-Mar|Coffee country with Mullayanagiri trekking.
sakleshpur|Sakleshpur|KA|hills,trekking,offbeat,weekend|12.94|75.79|Oct-Mar|Green Western Ghats town with plantations and viewpoints.
bandipur|Bandipur National Park|KA|wildlife,family|11.67|76.63|Oct-May|Tiger reserve in the Nilgiri biosphere.
nagarhole|Nagarhole National Park|KA|wildlife|12.05|76.12|Oct-May|Forest reserve of the Kabini river region.
gokarna|Gokarna|KA|beach,temple,offbeat|14.55|74.32|Oct-Mar|Temple town with quiet beaches.
om-beach|Om Beach|KA|beach,offbeat|14.52|74.32|Oct-Mar|Beach near Gokarna shaped like the Om symbol.
murudeshwar|Murudeshwar|KA|temple,beach|14.09|74.49|Oct-Mar|Shiva temple with a giant statue beside the sea.
jog-falls|Jog Falls|KA|waterfall|14.23|74.81|Jul-Oct|Tall segmented waterfall at its best after the monsoon.
munnar|Munnar|KL|hills,waterfall,honeymoon,family|10.09|77.06|Sep-May|Rolling tea estates, misty hills and waterfalls in the Western Ghats.
alleppey|Alleppey (Alappuzha)|KL|backwaters,honeymoon,family,food|9.50|76.34|Nov-Feb|Backwater canals, houseboats and village life.
wayanad|Wayanad|KL|hills,wildlife,waterfall,family|11.69|76.08|Oct-May|Forested hills with waterfalls and spice plantations.
periyar|Periyar Tiger Reserve|KL|wildlife,lake,family|9.46|77.23|Oct-May|Lake and forest reserve around Thekkady.
silent-valley|Silent Valley National Park|KL|wildlife,offbeat,trekking|11.08|76.43|Dec-Apr|Protected evergreen rainforest in the Nilgiris.
eravikulam|Eravikulam National Park|KL|wildlife,hills,trekking|10.19|77.05|Sep-May|Home of the Nilgiri tahr near Munnar.
varkala|Varkala|KL|beach,wellness,honeymoon|8.73|76.71|Nov-Mar|Cliff-top beach town with a temple and cafes.
kovalam|Kovalam|KL|beach,family,wellness|8.40|76.98|Nov-Mar|Crescent beaches south of Thiruvananthapuram.
marari|Marari Beach|KL|beach,offbeat,honeymoon|9.60|76.30|Nov-Mar|Quiet fishing-village beach near Alleppey.
cherai|Cherai Beach|KL|beach,family,weekend|10.14|76.18|Nov-Mar|Beach with backwater views near Kochi.
fort-kochi|Fort Kochi|KL|heritage,culture,food|9.96|76.24|Oct-Mar|Colonial-era quarter with art, cafes and Chinese fishing nets.
sabarimala|Sabarimala|KL|temple,hills|9.43|77.08|Nov-Jan|Hill shrine of Ayyappa with a defined pilgrimage season.
guruvayur|Guruvayur Temple|KL|temple|10.59|76.04|Oct-Mar|Major Krishna temple in Thrissur district.
padmanabhaswamy|Padmanabhaswamy Temple|KL|temple,heritage|8.48|76.94|Oct-Mar|Vishnu temple in Thiruvananthapuram; strict dress code applies.
khajuraho|Khajuraho|MP|heritage,temple|24.85|79.93|Oct-Mar|UNESCO listed medieval temples known for sculpture.
sanchi|Sanchi Stupa|MP|heritage,temple|23.48|77.74|Oct-Mar|Ancient Buddhist stupas, a UNESCO World Heritage Site.
mahakaleshwar|Mahakaleshwar, Ujjain|MP|temple|23.18|75.77|Oct-Mar|Jyotirlinga temple on the Shipra river.
omkareshwar|Omkareshwar|MP|temple,lake|22.24|76.15|Oct-Mar|Jyotirlinga on an island in the Narmada river.
kanha|Kanha National Park|MP|wildlife,family|22.33|80.61|Nov-Jun|Sal forests and meadows, setting of Jungle Book style stories.
bandhavgarh|Bandhavgarh National Park|MP|wildlife,fort|23.72|81.03|Nov-Jun|Tiger reserve with an ancient hill fort.
pench|Pench National Park|MP|wildlife,family|21.70|79.30|Nov-Jun|Teak forest reserve on the Maharashtra border.
orchha|Orchha|MP|heritage,fort,offbeat|25.35|78.64|Oct-Mar|Temples and palaces on the Betwa river.
pachmarhi|Pachmarhi|MP|hills,cave,waterfall,family|22.47|78.43|Oct-Jun|Satpura hill station with caves and waterfalls.
lonavala|Lonavala|MH|hills,waterfall,weekend,family|18.75|73.41|Jun-Sep, Nov-Feb|Sahyadri hill getaway popular for monsoon waterfalls and caves.
ajanta|Ajanta Caves|MH|cave,heritage|20.55|75.70|Oct-Mar|UNESCO listed Buddhist cave paintings and sculpture.
ellora|Ellora Caves|MH|cave,heritage,temple|20.03|75.18|Oct-Mar|UNESCO listed rock-cut temples of three religions.
elephanta|Elephanta Caves|MH|cave,heritage,island|18.96|72.93|Oct-Mar|Island cave temples reached by ferry from Mumbai.
shirdi|Shirdi|MH|temple|19.77|74.48|Oct-Mar|Pilgrimage town of Sai Baba.
siddhivinayak|Siddhivinayak Temple|MH|temple,city|19.02|72.83|Oct-Mar|Famous Ganesh temple in Mumbai.
tadoba|Tadoba-Andhari Tiger Reserve|MH|wildlife|20.20|79.34|Nov-Jun|Maharashtra's oldest and largest tiger reserve.
tarkarli|Tarkarli|MH|beach,adventure,offbeat|16.01|73.47|Oct-Mar|Clear-water beach known for scuba and snorkelling.
ganpatipule|Ganpatipule|MH|beach,temple|17.14|73.27|Oct-Mar|Seaside Ganesh temple on the Konkan coast.
mahabaleshwar|Mahabaleshwar|MH|hills,family,weekend|17.92|73.66|Oct-Jun|Strawberry-growing hill station in the Sahyadris.
loktak-lake|Loktak Lake|MN|lake,wildlife,offbeat|24.51|93.80|Oct-Mar|Large freshwater lake with floating phumdi islands.
kangla-fort|Kangla Fort, Imphal|MN|fort,heritage|24.81|93.94|Oct-Mar|Historic seat of Manipur's rulers.
meghalaya|Meghalaya (Shillong and Cherrapunji)|ML|hills,waterfall,offbeat,honeymoon|25.57|91.88|Oct-May|Living root bridges, big waterfalls and rolling hills.
cherrapunji|Cherrapunji (Sohra)|ML|waterfall,hills,offbeat|25.27|91.72|Oct-May|Among the wettest places on Earth, with dramatic waterfalls.
mawlynnong|Mawlynnong|ML|offbeat,culture,trekking|25.20|91.92|Oct-May|Tidy Khasi village close to the Bangladesh border.
aizawl|Aizawl|MZ|city,culture,hills|23.73|92.72|Oct-Mar|Hill capital with Mizo markets and views.
phawngpui|Phawngpui (Blue Mountain)|MZ|hills,trekking,offbeat|22.63|93.04|Oct-Mar|Mizoram's highest peak with a national park.
kohima|Kohima|NL|culture,city,hills,heritage|25.67|94.11|Oct-Mar|Naga hill capital, host of the Hornbill Festival in December.
dzukou-valley|Dzukou Valley|NL|trekking,offbeat,hills|25.55|94.08|Jun-Sep|High valley known for flowers in the monsoon.
khonoma|Khonoma|NL|offbeat,culture,trekking|25.65|94.02|Oct-Mar|Angami village known for terraced fields and conservation.
puri|Puri|OD|temple,beach,culture|19.81|85.83|Oct-Mar|Jagannath temple town on the Bay of Bengal.
konark|Konark Sun Temple|OD|heritage,temple|19.89|86.09|Oct-Mar|13th century chariot-shaped temple, a UNESCO World Heritage Site.
chilika|Chilika Lake|OD|lake,wildlife,offbeat|19.72|85.32|Nov-Feb|Large brackish lagoon known for migratory birds.
bhubaneswar|Bhubaneswar|OD|temple,heritage,city|20.30|85.82|Oct-Mar|Temple city with hundreds of ancient shrines.
simlipal|Simlipal National Park|OD|wildlife,waterfall,offbeat|21.60|86.40|Nov-Jun|Large forest reserve in northern Odisha.
golden-temple|Golden Temple, Amritsar|PB|temple,city,food|31.62|74.88|Oct-Mar|Holiest gurdwara of Sikhism with a free community kitchen.
harike-wetland|Harike Wetland|PB|lake,wildlife,offbeat|31.17|74.97|Nov-Feb|Large wetland with winter migratory birds.
jaipur|Jaipur|RJ|heritage,fort,city,food,family|26.91|75.79|Oct-Mar|The Pink City of forts, palaces and bazaars.
amber-fort|Amber Fort|RJ|fort,heritage|26.99|75.85|Oct-Mar|Hilltop palace-fort near Jaipur, part of a UNESCO listing.
hawa-mahal|Hawa Mahal|RJ|heritage,city|26.92|75.83|Oct-Mar|Honeycomb-fronted palace facade in Jaipur.
city-palace-jaipur|City Palace Jaipur|RJ|fort,heritage,city|26.93|75.82|Oct-Mar|Royal complex in the old city of Jaipur.
jaisalmer-fort|Jaisalmer Fort|RJ|fort,desert,heritage|26.91|70.91|Oct-Mar|Living golden sandstone fort in the Thar desert.
mehrangarh|Mehrangarh Fort, Jodhpur|RJ|fort,heritage|26.30|73.02|Oct-Mar|Massive fort above the blue city of Jodhpur.
chittorgarh|Chittorgarh Fort|RJ|fort,heritage|24.89|74.65|Oct-Mar|One of India's largest forts, a UNESCO World Heritage Site.
udaipur|Udaipur|RJ|lake,fort,honeymoon,heritage|24.58|73.68|Sep-Mar|City of lakes and palaces.
ranthambore|Ranthambore National Park|RJ|wildlife,fort,family|26.02|76.50|Oct-Jun|Tiger reserve around a historic fort.
ajmer-sharif|Ajmer Sharif Dargah|RJ|temple,culture|26.46|74.63|Oct-Mar|Sufi shrine of Khwaja Moinuddin Chishti.
pushkar|Pushkar|RJ|temple,lake,culture|26.49|74.55|Oct-Mar|Sacred lake town known for its camel fair season.
mount-abu|Mount Abu|RJ|hills,temple,lake|24.59|72.71|Oct-Jun|Rajasthan's only hill station, with Dilwara Jain temples.
sam-sand-dunes|Sam Sand Dunes|RJ|desert,adventure|26.83|70.55|Oct-Mar|Dune area near Jaisalmer for camel and jeep rides.
gangtok|Gangtok|SK|hills,city,culture|27.33|88.61|Mar-Jun, Oct-Dec|Hill capital with monasteries and mountain views.
pelling|Pelling|SK|hills,offbeat,honeymoon|27.30|88.24|Mar-Jun, Oct-Dec|Quiet town with views of Kanchenjunga.
yumthang|Yumthang Valley|SK|snow,offbeat,hills|27.83|88.69|Mar-Jun|Alpine valley known for rhododendron blooms in spring.
tsomgo-lake|Tsomgo Lake|SK|lake,snow,hills|27.37|88.76|Mar-Jun, Oct-Dec|High-altitude glacial lake near Gangtok.
ooty|Ooty|TN|hills,family,honeymoon|11.41|76.69|Mar-Jun, Sep-Nov|Classic Nilgiri hill station with lakes, gardens and toy train.
meenakshi-temple|Meenakshi Amman Temple|TN|temple,heritage,city|9.92|78.12|Oct-Mar|Colourful Dravidian temple complex in Madurai.
brihadeeswarar|Brihadeeswarar Temple|TN|temple,heritage|10.78|79.13|Oct-Mar|Great Chola temple in Thanjavur, a UNESCO World Heritage Site.
ramanathaswamy|Ramanathaswamy Temple|TN|temple,island|9.29|79.32|Oct-Mar|Jyotirlinga temple with long pillared corridors in Rameswaram.
dhanushkodi|Dhanushkodi|TN|beach,offbeat,island|9.18|79.43|Oct-Mar|Ghost-town tip of Pamban island facing Sri Lanka.
mahabalipuram|Mahabalipuram|TN|heritage,beach,temple|12.62|80.19|Nov-Mar|UNESCO listed shore temples and rock carvings.
marina-beach|Marina Beach|TN|beach,city,family|13.05|80.28|Nov-Mar|Long urban beach in Chennai.
kodaikanal|Kodaikanal|TN|hills,lake,honeymoon,family|10.24|77.49|Mar-Jun, Sep-Nov|Lakeside hill station in the Palani hills.
yercaud|Yercaud|TN|hills,offbeat,weekend|11.78|78.21|Oct-Jun|Small Shevaroy hills station with coffee estates.
kanyakumari|Kanyakumari|TN|beach,temple,culture|8.08|77.54|Oct-Mar|Southern tip of India known for sunrise views.
agartala|Agartala|TR|heritage,city,culture|23.84|91.28|Oct-Mar|Tripura's capital with Ujjayanta Palace.
unakoti|Unakoti|TR|heritage,offbeat|24.32|92.07|Oct-Mar|Hillside rock carvings and sculptures.
neermahal|Neermahal|TR|fort,lake,heritage|23.51|91.31|Oct-Mar|Lake palace on Rudrasagar lake.
varanasi|Varanasi|UP|temple,culture,food,heritage|25.32|82.97|Oct-Mar|Ancient city on the Ganga known for ghats and evening aarti.
taj-mahal|Taj Mahal|UP|heritage,city,family|27.18|78.04|Oct-Mar|Marble mausoleum in Agra, a UNESCO World Heritage Site.
agra-fort|Agra Fort|UP|fort,heritage|27.18|78.02|Oct-Mar|Red sandstone Mughal fort on the Yamuna.
fatehpur-sikri|Fatehpur Sikri|UP|heritage,fort|27.09|77.67|Oct-Mar|Abandoned Mughal capital, a UNESCO World Heritage Site.
ayodhya|Ayodhya|UP|temple,culture|26.80|82.20|Oct-Mar|Pilgrimage city on the Sarayu river.
mathura-vrindavan|Mathura and Vrindavan|UP|temple,culture|27.58|77.70|Oct-Mar|Krishna pilgrimage towns near Agra.
rishikesh|Rishikesh|UK|wellness,adventure,temple,river|30.09|78.27|Sep-Nov, Feb-May|Yoga capital by the Ganga, with rafting and Himalayan foothills.
haridwar|Haridwar|UK|temple,culture|29.95|78.16|Oct-Mar|Gateway to the Himalayan shrines with evening Ganga aarti.
kedarnath|Kedarnath|UK|temple,trekking,hills|30.74|79.07|May-Jun, Sep-Oct|High Himalayan Shiva shrine reached by a trek; season is limited.
badrinath|Badrinath|UK|temple,hills|30.74|79.49|May-Jun, Sep-Oct|Vishnu shrine in the Garhwal Himalaya; open only part of the year.
gangotri|Gangotri|UK|temple,hills|30.99|78.94|May-Jun, Sep-Oct|Source region pilgrimage of the Ganga; seasonal access.
yamunotri|Yamunotri|UK|temple,trekking,hills|31.01|78.45|May-Jun, Sep-Oct|Source shrine of the Yamuna with a short trek.
jim-corbett|Jim Corbett National Park|UK|wildlife,family|29.53|78.77|Nov-Jun|India's oldest national park on the Ramganga river.
mussoorie|Mussoorie|UK|hills,family,weekend,honeymoon|30.46|78.07|Mar-Jun, Sep-Nov|Queen of the Hills near Dehradun.
nainital|Nainital|UK|hills,lake,family,weekend|29.38|79.46|Mar-Jun, Sep-Nov|Lake town in the Kumaon hills.
auli|Auli|UK|snow,adventure,hills|30.53|79.57|Jan-Mar|Skiing slope with views of Nanda Devi.
valley-of-flowers|Valley of Flowers National Park|UK|trekking,wildlife,offbeat|30.73|79.60|Jul-Sep|UNESCO listed alpine meadow trek; open in season only.
darjeeling|Darjeeling|WB|hills,family,honeymoon,heritage|27.04|88.26|Mar-May, Oct-Nov|Tea gardens, toy train and Himalayan sunrise views.
sundarbans|Sundarbans|WB|wildlife,backwaters,offbeat|21.95|89.05|Sep-Mar|Mangrove delta explored by boat.
victoria-memorial|Victoria Memorial|WB|heritage,city,family|22.54|88.34|Oct-Mar|Marble museum and gardens in Kolkata.
shantiniketan|Shantiniketan|WB|culture,offbeat,weekend|23.68|87.68|Oct-Mar|University town linked to Rabindranath Tagore.
havelock|Havelock Island (Swaraj Dweep)|AN|island,beach,adventure,honeymoon|11.97|92.99|Oct-May|Famous Andaman island for diving and beaches.
neil-island|Neil Island (Shaheed Dweep)|AN|island,beach,offbeat,honeymoon|11.83|93.04|Oct-May|Smaller, quieter Andaman island.
radhanagar-beach|Radhanagar Beach|AN|beach,island,honeymoon|11.98|92.95|Oct-May|Wide white beach on Havelock Island.
elephant-beach|Elephant Beach|AN|beach,adventure,island|12.00|92.96|Oct-May|Snorkelling spot reached by boat from Havelock.
cellular-jail|Cellular Jail|AN|heritage,city|11.67|92.75|Oct-May|Colonial prison and memorial in Port Blair.
rock-garden-chandigarh|Rock Garden, Chandigarh|CH|city,culture,family|30.75|76.81|Oct-Mar|Sculpture garden made from recycled materials.
sukhna-lake|Sukhna Lake|CH|lake,family,weekend|30.74|76.82|Oct-Mar|Man-made lake at the foot of the Shivalik hills.
diu|Diu|DD|beach,fort,offbeat|20.71|70.98|Oct-Mar|Island town with a Portuguese fort and quiet beaches.
daman|Daman|DD|beach,fort,weekend|20.41|72.83|Oct-Mar|Coastal town with forts and beaches.
red-fort|Red Fort, Delhi|DL|fort,heritage,city|28.66|77.24|Oct-Mar|Mughal fort and UNESCO World Heritage Site in Old Delhi.
qutub-minar|Qutub Minar|DL|heritage,city|28.52|77.19|Oct-Mar|Medieval victory tower, a UNESCO World Heritage Site.
humayuns-tomb|Humayun's Tomb|DL|heritage,city|28.59|77.25|Oct-Mar|Early Mughal garden tomb, a UNESCO World Heritage Site.
srinagar|Srinagar|JK|lake,hills,honeymoon,heritage|34.08|74.80|Apr-Oct|Dal Lake, houseboats and Mughal gardens.
gulmarg|Gulmarg|JK|snow,adventure,hills|34.05|74.38|Dec-Mar, Apr-Jun|Meadow resort known for skiing in winter.
pahalgam|Pahalgam|JK|hills,trekking,family|34.02|75.32|Apr-Oct|Lidder valley town and base for treks.
sonamarg|Sonamarg|JK|hills,snow,trekking|34.30|75.29|May-Sep|Alpine meadow valley on the road to Ladakh.
vaishno-devi|Vaishno Devi|JK|temple,hills|33.03|74.95|Mar-Oct|Major hill shrine reached by a long walk from Katra.
leh|Leh|LA|hills,culture,adventure,temple|34.15|77.58|May-Sep|High-altitude town and base for Ladakh; acclimatise before activity.
nubra-valley|Nubra Valley|LA|desert,hills,adventure|34.69|77.56|May-Sep|Cold desert valley with dunes and monasteries.
pangong-tso|Pangong Tso|LA|lake,hills,offbeat|33.75|78.67|May-Sep|High-altitude lake changing colour through the day.
hemis|Hemis Monastery|LA|temple,culture|33.92|77.70|May-Sep|Large Buddhist monastery near Leh.
agatti|Agatti Island|LD|island,beach,offbeat,honeymoon|10.86|72.18|Oct-May|Coral island with a lagoon; entry permit is required for visitors.
kavaratti|Kavaratti|LD|island,beach,offbeat|10.57|72.64|Oct-May|Capital of Lakshadweep with lagoons; entry permit is required.
pondicherry|Pondicherry|PY|beach,heritage,food,honeymoon|11.93|79.83|Oct-Mar|French-quarter town on the Bay of Bengal.
auroville|Auroville|PY|wellness,culture,offbeat|12.01|79.81|Oct-Mar|Experimental township near Pondicherry.
"""

SOURCE_NOTE = "Curated seed list from general knowledge; not verified against official sources."
FEATURED = {
    "munnar", "alleppey", "hampi", "goa", "jaipur", "taj-mahal", "varanasi", "leh", "meghalaya", "kaziranga",
    "havelock", "udaipur", "kedarnath", "tirupati", "darjeeling", "gokarna", "jim-corbett", "kutch", "coorg",
    "rishikesh", "srinagar", "golden-temple", "ranthambore", "araku-valley", "pondicherry",
}
MONTHS = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}


def slugify(text: str) -> str:
    out = "".join(c.lower() if c.isalnum() else "-" for c in text)
    return "-".join(p for p in out.split("-") if p)


def parse_months(season: str) -> list[int]:
    """'Oct-Mar, Jun' -> [10,11,12,1,2,3,6]. Returns all 12 months for empty/year-round text."""
    found: set[int] = set()
    for part in season.split(","):
        bits = [b.strip().lower()[:3] for b in part.split("-")]
        if not bits or bits[0] not in MONTHS:
            continue
        start = MONTHS[bits[0]]
        end = MONTHS.get(bits[-1], start)
        m = start
        while True:
            found.add(m)
            if m == end:
                break
            m = m % 12 + 1
    return sorted(found) or list(range(1, 13))


def _build() -> list[dict]:
    rows = []
    for line in _RAW.strip().splitlines():
        pid, name, code, tags, lat, lng, season, summary = [x.strip() for x in line.split("|")]
        state, kind = STATES[code]
        rows.append({
            "id": pid, "slug": pid, "name": name, "state": state, "state_slug": slugify(state), "kind": kind,
            "tags": tags.split(","), "lat": float(lat), "lng": float(lng), "best_season": season,
            "months": parse_months(season), "summary": summary, "featured": pid in FEATURED,
        })
    return rows


PLACES: list[dict] = _build()
PLACE_BY_ID: dict[str, dict] = {p["id"]: p for p in PLACES}
