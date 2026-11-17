const LIC = {
  "CC BY 2.0": "https://creativecommons.org/licenses/by/2.0/",
  "CC BY 2.5": "https://creativecommons.org/licenses/by/2.5/",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-SA 2.5": "https://creativecommons.org/licenses/by-sa/2.5/",
  "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "Public domain": null
};
const SITES = [
  {
    id: "paracas", slug: "paracas", name: "Paracas", place: "Ica, Peru", lat: -13.86, lon: -76.30, earth: [-13.858, -76.302, 60, 6000, 0, 45],
    era: "Paracas culture, c. 800 BCE – 100 CE", gap: "Missing provenance", kind: "lacuna",
    lede: "The elongated skulls of Paracas are real. So is the paperwork gap around where some of the burials went.",
    known: "Julio C. Tello excavated hundreds of mummy bundles at Cerro Colorado from 1925. A 2022 study found intentional cranial modification in 98.1% of 159 Paracas Cavernas individuals (Gómez-Mejía et al.). Shaping an infant's skull with boards and bindings was a deliberate cultural practice, not a mystery of biology.",
    missing: "In 1937 four bundles left Peru with $3,000 of Rockefeller support: Nos. 113, 114 and 188 to the American Museum of Natural History, accessioned in 1946, and No. 16 to Harvard's Peabody Museum. No return to Peru is recorded, and the records disagree on whether they went as a loan or a gift.",
    question: "Were the 1937 bundles loaned or given, and where is each one today?",
    spec: "Claims that Paracas skulls carry non-human DNA come from unpublished tests promoted by Brien Foerster. No peer-reviewed genome supports them.",
    work: "Lacuna published an open CC BY 4.0 dataset on the bundles that left Peru, and has scored 166 auction lots for provenance, flagging 18. Peru's Ministry of Culture is acting on 8 of them.",
    link: { href: "research/paracas-bundles/", text: "Open the Paracas bundles dataset" },
    sources: ["Gómez-Mejía et al., cranial modification at Paracas Cavernas (2022)", "Tello excavation records, Cerro Colorado (1925 onward)", "AMNH and Peabody Museum accession records", "Lacuna Institute, Paracas bundles dataset (2026)"],
    img: { key: "paracas", alt: "Three elongated Paracas skulls on pedestals in a museum case", credit: "Marcin Tłustochowicz", lic: "CC BY 2.0", file: "ParacasSkullsIcaMuseum.jpg", caption: "Elongated skulls, Museo Regional de Ica" }
  },
  {
    id: "rapanui", slug: "rapa-nui", name: "Rapa Nui", sub: "Ahu Vinapu, Easter Island", place: "Chile", lat: -27.175, lon: -109.405, earth: [-27.1765, -109.4045, 30, 1500, 0, 55],
    era: "Settled c. 1200 CE", gap: "Untested resemblance", kind: "lacuna",
    lede: "One wall on Rapa Nui looks as if an Andean mason built it, 3,700 km from South America.",
    known: "The facade of Ahu Tahira at Vinapu is made of tightly fitted basalt slabs, unlike most platforms on the island. Genomes show Polynesian and Native American ancestry mixing around 1200 CE (Ioannidis et al. 2020), and Rapanui genomes published in 2024 confirm contact before Europeans arrived (Moreno-Mayar et al. 2024).",
    missing: "No one has measured the wall in a way that tests where the technique came from. The rongorongo script, surviving on about two dozen wooden objects, is still undeciphered.",
    question: "Does the wall stand vertical, like Tiwanaku work, or lean inward 3–5°, like Inca walls? That one measurement would point to a source.",
    spec: "Thor Heyerdahl argued in the 1950s that South Americans built Vinapu. Genetics shows the island was settled from Polynesia. Contact with the Americas happened, but who carried what, and in which direction, is open.",
    work: "Lacuna is seeking access to the 2024 Rapanui genomes, which aren't yet in the public AADR dataset, and has scoped the wall-batter measurement.",
    sources: ["Ioannidis et al., Nature 583 (2020)", "Moreno-Mayar et al., Nature (2024)", "Heyerdahl, Aku-Aku (1958)"],
    img: { key: "vinapu", alt: "Close-up of the tightly fitted basalt blocks of Ahu Vinapu", credit: "Koppas", lic: "CC BY-SA 3.0", file: "Ahu_Vinapu.JPG", caption: "Fitted basalt at Ahu Vinapu" }
  },
  {
    id: "baghdad", slug: "baghdad-battery", name: "The Baghdad battery", place: "Khujut Rabu, Iraq", lat: 33.25, lon: 44.5, earth: [33.24, 44.47, 35, 5000, 0, 30],
    era: "Parthian–Sasanian, c. 250 BCE – 650 CE", gap: "Unverified whereabouts", kind: "lacuna",
    lede: "A clay jar, a copper cylinder and an iron rod. Nobody has publicly confirmed where they are now.",
    known: "The jar was found in 1936 at Khujut Rabu near Ctesiphon and catalogued by the Iraq Museum as IM29209 (jar), IM29210 (copper cylinder) and IM29211 (iron rod), published by Al-Haik in Sumer in 1964. Wilhelm König suggested in 1938 that it was a galvanic cell. Most archaeologists read it as a storage vessel for sacred scrolls.",
    missing: "Any public sighting of the objects since the Iraq Museum was looted in 2003. Robert Hafford at the Penn Museum knows of no official report that they went missing. The museum reopened on 28 February 2015.",
    question: "Is it still on the shelf in Baghdad?",
    spec: "Claims that it was stolen in 2003, or taken into US custody, are unsupported as far as we can find. So is the idea that it was used for electroplating.",
    work: "Lacuna has asked Iraq's State Board of Antiquities and Heritage and US Army Central directly.",
    sources: ["Al-Haik, Sumer 20 (1964)", "König, Im verlorenen Paradies (1940)", "Lacuna Institute, “What actually happened to the Baghdad battery?” (2026)"],
    img: { key: "baghdad", alt: "Drawing of the clay jar, copper cylinder and iron rod", credit: "Ironie", lic: "CC BY-SA 2.5", file: "Ironie_pile_Bagdad.jpg", caption: "The three parts, drawn to scale", fit: "contain", light: true }
  },
  {
    id: "sahel", slug: "green-sahara", name: "The Green Sahara", sub: "and the Sahel baseline", place: "Maradi, Niger", lat: 13.5, lon: 7.1, earth: [13.5, 7.1, 400, 150000, 0, 0],
    era: "African Humid Period, c. 14,500 – 5,000 years ago", gap: "Missing baseline", kind: "lacuna",
    lede: "The Sahara was green within human memory. The record of what the Sahel looked like before 1970 is mostly still in boxes.",
    known: "During the African Humid Period the Sahara held savanna, rivers and lakes, with up to ten times today's rainfall (Tierney et al. 2017). The desert returned about 5,000–6,000 years ago north of 15°N, and later further south. Rock art at Tassili n'Ajjer shows herds of cattle where there is now sand.",
    missing: "A tree-by-tree picture of the Sahel before the droughts of the 1970s. French aerial surveys from the 1950s and 60s sit in the defence archive with no item inventory, and the colonial archive in Dakar runs to about 3 km of shelving.",
    question: "What did the Sahel's tree cover look like before 1970, field by field?",
    work: "Lacuna is working on recovering that baseline, starting with the aerial photo archive, for a study zone near Maradi.",
    sources: ["Tierney, Pausata & deMenocal, Science Advances (2017)", "Lacuna Institute, Green Sahara briefing (2026)"],
    img: { key: "sahara", alt: "Rock painting of cattle and herders on a sandstone wall", credit: "IssamBarhoumi", lic: "CC BY-SA 4.0", file: "Daily_scene_with_cattle.jpg", caption: "Cattle herders in rock art, Tassili n'Ajjer, Algeria" }
  },
  {
    id: "richat", slug: "eye-of-the-sahara", name: "The Eye of the Sahara", sub: "The Richat Structure", place: "Adrar, Mauritania", lat: 21.124, lon: -11.402, earth: [21.124, -11.402, 400, 70000, 0, 0],
    era: "Rock dome c. 100 million years old · people here for hundreds of thousands of years", gap: "The Atlantis question", kind: "watch",
    lede: "A bullseye 40 km wide in the Mauritanian desert, visible from orbit. Some think Plato described it.",
    known: "The Richat Structure is a rock dome that rose and was worn down into concentric rings of hard quartzite and softer rock. Its core formed roughly 100 million years ago, and geologists read it as an eroded uplift, not an impact crater (Matton et al. 2005). Stone tools, including Acheulean hand axes, show people camped around it over hundreds of thousands of years.",
    missing: "Systematic excavation of the human sites around the rings, and a record of how the land looked here when the Sahara was green.",
    question: "Who lived around the Eye when the Sahara was green, and what did they leave behind?",
    legends: [
      { h: "Atlantis", p: "In the Critias Plato describes Atlantis as a city of concentric rings of land and water, with mountains to the north and a great plain opening to the sea, lost about 9,000 years before Solon. Supporters point to the Eye's rings, a width close to the commonly cited size of Plato's city, the mountains to its north, and the wetter Sahara of that time." },
      { h: "The other side", p: "The rings are natural rock layers that formed long before people, Plato places Atlantis on an island in the Atlantic, and no trace of a city or harbour has been found in the Eye. Whether Plato wrote history or a parable is itself an old argument." }
    ],
    sources: ["Matton et al., Geology 33 (2005)", "Plato, Critias and Timaeus", "Tierney, Pausata & deMenocal, Science Advances (2017)"],
    img: { key: "richat", alt: "The Richat Structure seen from orbit, a ring of eroded rock in the desert", credit: "NASA", lic: "Public domain", file: "Richat_Structure_ISS030-E-12516.jpg", caption: "The Eye of the Sahara from the International Space Station" }
  },
  {
    id: "canyon", slug: "grand-canyon", name: "The Grand Canyon", sub: "The missing billion years, and Kincaid's Cave", place: "Arizona, USA", lat: 36.07, lon: -112.15, earth: [36.235, -111.835, 1000, 20000, 330, 62],
    era: "Rocks 1.7 billion years old · a cave city reported in 1909", gap: "Missing time", kind: "watch",
    lede: "A billion years missing from the rock, a cave city reported in 1909 and never found, and a stretch of canyon almost no one is allowed to walk.",
    known: "At the Great Unconformity the Tapeats Sandstone, about 525 million years old, rests directly on Vishnu Schist about 1.7 billion years old. Everything laid down in between was worn away. Upstream, where the Little Colorado River meets the Colorado, access is tightly restricted: the east side is Navajo Nation land, entry needs a Navajo Nation permit, few trails reach it, and the area is sacred to the Hopi, whose Sipapu, the place of emergence, lies up the Little Colorado.",
    missing: "More than a billion years of rock record; geologists still debate what removed it (Keller et al. 2019 tie it to Snowball Earth). And from the 1909 cave: no location, no artifact and no photograph has ever surfaced.",
    question: "What erased the missing billion years, and what lies in the canyon's most closely guarded reaches?",
    hyp: "The official reason for the restrictions is sacred land and safety. We think something more is being kept out of view in this part of the canyon, and we want to know what.",
    legends: [
      { h: "Kincaid's Cave", p: "On 5 April 1909 the Arizona Gazette ran “Explorations in Grand Canyon”. In it G. E. Kinkaid, described as a Smithsonian man, tells of a cave high in the canyon wall with long tunnels, a shrine with a seated idol, mummies and copper tools in an ‘Oriental’ style, big enough to shelter thousands. Retellings since have called it Egyptian." },
      { h: "Where it might be", p: "A theory shared on Reddit's r/GrahamHancock puts the entrance on the east wall near Kwagunt Rapids, across from the Nankoweap Granaries, where travellers' 3D photos on Google Earth appear to show a large rectangular opening." },
      { h: "Soldiers and helicopters", p: "In the same thread a commenter says their Navajo grandfather heard explosions in the canyon in the 1950s, saw army trucks on the rim road, and knew of a concrete block on the cliff edge stamped with an army insignia. Another says a hiker was turned back by two armed soldiers in ghillie suits. A veteran writes that their Command Sergeant Major spoke of Egyptian artifacts and a secret Army base in the canyon. Stories of black helicopters over the area are told again and again." },
      { h: "The other side", p: "The Smithsonian says it never employed a G. E. Kincaid or an S. A. Jordan, the Coconino Sun hinted within days that the story was a hoax, and no artifact has been produced. We have found no record of a base. That is the gap." }
    ],
    sources: ["Keller et al., PNAS 116 (2019)", "Timmons & Karlstrom (eds), Grand Canyon Geology, GSA Special Paper 489 (2012)", "Arizona Gazette, 5 April 1909", "Coconino Sun, 16 April 1909", "Navajo Nation Parks & Recreation, backcountry permits", "r/GrahamHancock thread on the Kincaid cave (2025)"],
    img: { key: "canyon", alt: "The Grand Canyon from Hopi Point at sunset", credit: "Mikenorton", lic: "CC BY-SA 4.0", file: "Great_Unconformity_Tapeats_Sandstone_over_Vishnu_Schist_from_Hopi_Point.jpg", caption: "Tapeats Sandstone over Vishnu Schist, from Hopi Point" }
  },
  {
    id: "sedona", slug: "secret-mountain", name: "Secret Mountain", sub: "Palatki and Honanki", place: "Sedona, Arizona", lat: 34.916, lon: -111.901, earth: [34.93, -111.895, 1500, 9000, 10, 65],
    era: "Southern Sinagua, c. 1150 – 1350 CE", gap: "Unexplained abandonment", kind: "watch",
    lede: "Cliff houses tucked under Secret Mountain, walls of painted symbols, and a people who walked away around 1400.",
    known: "In the red-rock canyons below Secret Mountain, west of Sedona, the Southern Sinagua built cliff dwellings at Palatki and Honanki between about 1150 and 1350 CE. The alcoves hold layer on layer of rock art, from Archaic hunters thousands of years earlier through the Sinagua to later Yavapai and Apache.",
    missing: "Why the Sinagua left. By about 1400 the cliff houses stood empty. Drought, conflict, disease and a pull toward the Hopi mesas have all been proposed, and Hopi tradition counts Sinagua among its ancestors, but no single cause is settled.",
    question: "What drove the Sinagua from Sedona's canyons around 1400, and what do the oldest symbols on the walls record?",
    legends: [
      { h: "Vortexes and portals", p: "Sedona is famous for its ‘vortexes’, places said to swirl with energy. Visitors to Secret Mountain and its canyons tell of lights, humming and lost time, and some read the spirals and figures on the walls as a record of visitors from elsewhere." },
      { h: "The other side", p: "No instrument has measured a vortex, and archaeologists read the rock art as clan symbols, calendars and ceremony. We list the stories because people keep telling them." }
    ],
    sources: ["Coconino National Forest, Palatki and Honanki Heritage Sites", "Pilles, The Southern Sinagua, Plateau 45 (1973)"],
    img: { key: "sedona", alt: "Stone walls of a Sinagua cliff dwelling under a red sandstone cliff", credit: "Matthew Field", lic: "CC BY-SA 4.0", file: "Palatki_sinagua_indian_dwellings.jpg", caption: "Sinagua dwellings at Palatki" }
  },
  {
    id: "amazon", slug: "amazon-earthworks", name: "The Amazon earthworks", place: "Acre, Brazil", lat: -10.0, lon: -67.8, earth: [-10.0, -67.8, 200, 60000, 0, 0],
    era: "c. 600 BCE – 950 CE", gap: "Hidden landscape", kind: "watch",
    lede: "The “untouched” rainforest was once a managed landscape of earthworks, roads and towns.",
    known: "A lidar survey across Acre and Amazonas found 432 earthworks, only 36 of them previously known (Pärssinen et al., Nature 2026). The builders were active from about 600 BCE and left between 850 and 950 CE. Similar hidden settlements have turned up in Ecuador's Upano Valley (Rostain et al. 2024) and at Casarabe in Bolivia (Prümers et al. 2022).",
    missing: "Most of the Amazon has never been scanned. The authors model 24,000–30,000 such features across their region, which is under 3% of the basin.",
    question: "How many people lived in Amazonia before 1492, and what did they build? The same study puts the regional population at 1.25–3 million at its peak.",
    sources: ["Pärssinen et al., Nature (2026), doi:10.1038/s41586-026-10835-7", "Rostain et al., Science 383 (2024)", "Prümers et al., Nature 606 (2022)"],
    img: { key: "amazon", alt: "Aerial view of a geometric ditch geoglyph in cleared Amazon land", credit: "Sanna Saunaluoma", lic: "CC BY-SA 3.0", file: "Fazenda_Colorada.jpg", caption: "Fazenda Colorada geoglyph, Acre" }
  },
  {
    id: "mosquitia", slug: "la-mosquitia", name: "La Mosquitia", sub: "The “Lost City of the Monkey God”", place: "Honduras", lat: 15.3, lon: -84.9, earth: [15.3, -84.9, 300, 40000, 0, 50],
    era: "Unnamed culture, c. 1000 – 1400 CE", gap: "Unnamed culture", kind: "watch",
    note: "Often filed under the Amazon, but it's in the rainforest of eastern Honduras.",
    lede: "Lidar found a city under the canopy. The people who built it still don't have a name.",
    known: "Lidar flown in May 2012 revealed ruins in an unexplored valley. The 2015 expedition found plazas, earthworks, mounds and an earthen pyramid, plus a cache of 52 stone objects including carved metates and a were-jaguar head. The settlements date to roughly 1000–1400 CE.",
    missing: "Who these people were, what they called themselves, and what emptied their cities. Only a small part has been excavated.",
    question: "Who built the cities of La Mosquitia, and why were they abandoned?",
    spec: "Explorer Theodore Morde said in 1940 that he had found the “Lost City of the Monkey God” and its giant monkey statue. He never revealed the location, and no one has confirmed his account.",
    sources: ["Preston, National Geographic (2 March 2015)", "Preston, The Lost City of the Monkey God (2017)"],
    img: { key: "mosquitia", alt: "Newspaper portrait of explorer Theodore Morde in 1940", credit: "Unknown photographer", lic: "Public domain", file: "Theodore_Morde_in_1940.png", caption: "Theodore Morde in 1940", fit: "contain", light: true }
  },
  {
    id: "longview", slug: "mount-coffin", name: "Mount Coffin", place: "Longview, Washington", lat: 46.129, lon: -122.988, earth: [46.129, -122.988, 10, 15000, 0, 45],
    era: "Cowlitz and Chinookan burial ground", gap: "Destroyed record", kind: "lacuna",
    lede: "A 240-foot rock on the Columbia was a burial ground for generations. It was burned, looted, then blasted into fill.",
    known: "Lieutenant Broughton saw “several canoes, containing dead bodies” there in 1792, and John Kirk Townsend saw “a great number of canoes” in 1835. In August 1841 a campfire from the Wilkes Expedition burned the burial canoes. From 1929 the rock was dynamited and quarried for the Port of Longview.",
    missing: "Any count of who was buried there. No inventory was made before it was destroyed, and remains taken in the 1800s, including a skull removed in 1825, were never tracked.",
    question: "How many people rested on Mount Coffin, and where did the remains taken from it end up?",
    spec: "A figure of 3,000 elongated skulls, given on The Joe Rogan Experience #2563, has no source we can find. Chinookan peoples did shape infants' heads, but into a flattened wedge that marked free status, not the conical shape seen at Paracas.",
    work: "Lacuna is tracing the 19th-century removals and the 1929 quarry records.",
    sources: ["Vancouver, A Voyage of Discovery (1798)", "Townsend, Narrative of a Journey (1839)", "Wilkes, Narrative of the US Exploring Expedition (1845)"],
    img: { key: "longview", alt: "Old photograph of Mount Coffin, a wooded rock rising from the Columbia River", credit: "Gerald W. Williams Collection, Oregon State University", lic: "Public domain", file: "Gerald_W._Williams_Collection%2C_Ford_-47%2C_courtesy_Oregon_State.jpg", caption: "Mount Coffin on the Columbia, before quarrying" }
  },
  {
    id: "rushmore", slug: "mount-rushmore", name: "Mount Rushmore", sub: "The Six Grandfathers", place: "Black Hills, South Dakota", lat: 43.879, lon: -103.459, earth: [43.8791, -103.4591, 1700, 1200, 315, 75],
    era: "Sacred long before · carved 1927 – 1941", gap: "Sealed vault", kind: "watch",
    lede: "Before the four presidents, the Lakota called this peak the Six Grandfathers. Behind the faces is a vault that was sealed in 1998.",
    known: "The peak, Tȟuŋkášila Šákpe to the Lakota, stands in the Black Hills guaranteed to the Sioux by the Fort Laramie Treaty of 1868. The US took the Hills after gold was found. In United States v. Sioux Nation of Indians (1980) the Supreme Court ruled the taking unlawful; the Lakota have refused the compensation and ask for the land. Gutzon Borglum carved the faces from 1927 to 1941.",
    missing: "Borglum's Hall of Records, a great chamber in the canyon behind the faces meant to hold the nation's founding documents, was abandoned in 1939 as a 70-foot tunnel. In 1998 a titanium vault holding 16 porcelain enamel panels was set into its floor and sealed under a granite capstone. The hall is closed to the public.",
    question: "What did the Six Grandfathers mean before the carving, and what was the Hall of Records meant to become?",
    legends: [
      { h: "What else is inside", p: "Some believe the Hall of Records holds more than the official panels, that the tunnels behind the faces run deeper than anyone admits, and that a sacred mountain was chosen on purpose. Others tie the Black Hills to older stories of chambers beneath the peaks." },
      { h: "The other side", p: "The Park Service lists the vault's contents as the texts of the founding documents and the story of the carving. We have seen no evidence of other rooms." }
    ],
    sources: ["Fort Laramie Treaty (1868)", "United States v. Sioux Nation of Indians, 448 U.S. 371 (1980)", "National Park Service, Mount Rushmore: Hall of Records"],
    img: { key: "rushmore", alt: "The four carved faces of Mount Rushmore under a blue sky", credit: "Dean Franklin", lic: "CC BY 2.0", file: "Dean_Franklin_-_06.04.03_Mount_Rushmore_Monument_(by-sa)-3_new.jpg", caption: "Mount Rushmore National Memorial" }
  },
  {
    id: "gobekli", slug: "gobekli-tepe", name: "Göbekli Tepe", place: "Şanlıurfa, Türkiye", lat: 37.223, lon: 38.922, earth: [37.2231, 38.9224, 780, 600, 0, 45],
    era: "c. 9600 – 8200 BCE", gap: "Too early for the story", kind: "watch",
    lede: "Carved stone enclosures raised about 11,000 years ago, before pottery, writing or settled farming.",
    known: "Excavations led by Klaus Schmidt from 1995 uncovered round enclosures of T-shaped limestone pillars up to about 5.5 m tall, carved with foxes, boars, snakes and vultures. Later work found houses, cisterns and tools, so it was a lived-in place, not only a temple.",
    missing: "Most of the site is still unexcavated, and geophysics shows more enclosures underground. Related sites nearby, such as Karahan Tepe, have barely begun to be dug.",
    question: "How did people organise monument building before farming, and what were these places for?",
    spec: "A 2017 paper read Pillar 43 as a record of a comet impact (Sweatman & Tsikritsis). Archaeologists who work at the site dispute that reading.",
    sources: ["Schmidt, Göbekli Tepe: A Stone Age Sanctuary (2012)", "Sweatman & Tsikritsis, Mediterranean Archaeology and Archaeometry (2017)"],
    img: { key: "gobekli", alt: "A carved T-shaped limestone pillar with an animal relief", credit: "Teomancimit", lic: "CC BY-SA 3.0", file: "Gobekli_Tepe_2.jpg", caption: "Carved pillar in Enclosure D" }
  },
  {
    id: "antikythera", slug: "antikythera-mechanism", name: "The Antikythera mechanism", place: "Antikythera, Greece", lat: 35.87, lon: 23.30, earth: [35.87, 23.3, 0, 9000, 0, 45],
    era: "c. 200 – 60 BCE", gap: "Missing lineage", kind: "watch",
    lede: "A geared analogue computer from ancient Greece, with no known ancestors and no descendants for over a thousand years.",
    known: "Sponge divers found a shipwreck off Antikythera in 1900, and the corroded mechanism came up in 1901. CT scans show bronze gearing that modelled the Sun, Moon and planets and predicted eclipses (Freeth et al. 2006, 2021). It survives as 82 fragments in Athens.",
    missing: "Every step of the craft tradition that produced it. Nothing comparable survives until the astronomical clocks of medieval Europe and the Islamic world.",
    question: "Who made it, and how many others like it existed?",
    spec: "Cicero describes geared spheres linked to Archimedes and Posidonius. Tying the mechanism to either is an educated guess.",
    sources: ["Freeth et al., Nature 444 (2006)", "Freeth et al., Scientific Reports 11 (2021)", "National Archaeological Museum, Athens"],
    img: { key: "antikythera", alt: "The largest corroded bronze fragment of the Antikythera mechanism, showing a gear wheel", credit: "Marsyas", lic: "CC BY 2.5", file: "NAMA_Machine_d%27Anticyth%C3%A8re_1.jpg", caption: "Fragment A, National Archaeological Museum, Athens" }
  },
  {
    id: "nanmadol", slug: "nan-madol", name: "Nan Madol", place: "Pohnpei, Micronesia", lat: 6.844, lon: 158.335, earth: [6.844, 158.335, 2, 2500, 0, 45],
    era: "Megalithic phase from c. 1180 CE", gap: "Unrecorded engineering", kind: "watch",
    lede: "A city of basalt columns built on a reef, the seat of a dynasty that left no writing.",
    known: "Nan Madol is close to a hundred artificial islets off Pohnpei, walled with stacked columnar basalt. Uranium-thorium dating puts the royal tomb of Nandauwas at about 1180–1200 CE, the earliest dated monumental burial in the Pacific (McCoy et al. 2016).",
    missing: "How columns weighing up to several tonnes were brought from their quarries and raised. There is no written account; oral history says it was the seat of the Saudeleur rulers.",
    question: "Which quarries supplied the basalt, and how was it moved across the lagoon?",
    spec: "Pohnpeian tradition says two sorcerers, Olisihpa and Olosohpa, flew the stones into place. It's an account worth recording, but not an engineering one.",
    sources: ["McCoy, Athens & Barker, Quaternary Research (2016)", "UNESCO World Heritage listing (2016)"],
    img: { key: "nanmadol", alt: "A wall of stacked basalt columns rising behind jungle at Nan Madol", credit: "Patrick Nunn", lic: "CC BY-SA 4.0", file: "Nan_Madol_megalithic_site%2C_Pohnpei_%28Federated_States_of_Micronesia%29_10.jpg", caption: "Basalt walls of Nan Madol" }
  },
  {
    id: "sacsay", slug: "sacsayhuaman", name: "Sacsayhuamán", place: "Cusco, Peru", lat: -13.508, lon: -71.982, earth: [-13.5094, -71.9817, 3600, 1200, 0, 55],
    era: "Inca, mainly 15th century CE", gap: "Unrecorded technique", kind: "watch",
    lede: "Zigzag walls of giant polygonal blocks, fitted so closely there's no room for a blade.",
    known: "The walls above Cusco were built by the Inca, mostly from the mid-1400s, and Spanish chroniclers saw parts of the complex in use. The largest blocks are estimated at well over 100 tonnes. Experiments by Jean-Pierre Protzen showed that hammerstones and repeated test-fitting can produce Inca-style joints.",
    missing: "A full account of how the work was organised and how the biggest blocks were moved. No Inca description of the method survives.",
    question: "How did Inca builders achieve this fit at this scale, and how fast?",
    spec: "Ideas that the stones were softened, or that an older civilisation laid the lower courses, have no supporting evidence.",
    sources: ["Protzen, Inca Architecture and Construction at Ollantaytambo (1993)", "Garcilaso de la Vega, Comentarios Reales (1609)"],
    img: { key: "sacsay", alt: "Long terraced walls of massive stones at Sacsayhuamán under a cloudy sky", credit: "Wolfgangbeyer", lic: "CC BY-SA 3.0", file: "Sacsayhuaman.jpg", caption: "The terraced walls of Sacsayhuamán" }
  },
  {
    id: "tiwanaku", slug: "tiwanaku-puma-punku", name: "Tiwanaku & Puma Punku", place: "La Paz, Bolivia", lat: -16.561, lon: -68.680, earth: [-16.558, -68.676, 3850, 2500, 0, 45],
    era: "Tiwanaku state, c. 500 – 1000 CE", gap: "Lost layout", kind: "watch",
    lede: "Precisely cut, repeating stone blocks, scattered by centuries of quarrying and looting.",
    known: "Puma Punku is part of Tiwanaku, a city near Lake Titicaca at about 3,850 m. Its andesite and sandstone blocks repeat standard shapes, and metal cramps once tied them together. Researchers have used 3D-printed models of the pieces to test how they fit (Vranich 2018).",
    missing: "The original plan. Stones were carted off for colonial churches and railway ballast and shifted by later digs, so how they stood is uncertain.",
    question: "What did Puma Punku look like when it was finished?",
    spec: "Ancient-astronaut claims about the stones have nothing behind them. The cutting fits skilled stoneworkers using abrasives and templates.",
    sources: ["Vranich, Heritage Science 6 (2018)", "Kolata, The Tiwanaku (1993)"],
    img: { key: "puma", alt: "Scattered cut stone blocks on the grassy ruins of Puma Punku", credit: "Brattarb", lic: "CC BY-SA 3.0", file: "Puma_Punku14.JPG", caption: "The scattered blocks of Puma Punku" }
  },
  {
    id: "padang", slug: "gunung-padang", name: "Gunung Padang", place: "West Java, Indonesia", lat: -6.994, lon: 107.056, earth: [-6.9937, 107.0563, 900, 1000, 0, 55],
    era: "Age disputed", gap: "Retracted claim", kind: "watch",
    lede: "Terraces of columnar andesite on a Javan hilltop, at the centre of a dating fight.",
    known: "Gunung Padang is a terraced megalithic site long known to archaeologists. A 2023 paper in Archaeological Prospection (Natawidjaja et al.) argued that the hill was built in stages starting about 27,000 years ago.",
    missing: "Evidence that the oldest dated layers were made by people. The paper was retracted on 20 March 2024 because the dated soil was “not associated with any artifacts or features that could be reliably interpreted as anthropogenic”. The authors disagree with the retraction.",
    question: "Is there human construction deep inside the hill, and if so, how old is it?",
    spec: "Claims that Gunung Padang is the world's oldest pyramid rest on the retracted dating.",
    sources: ["Natawidjaja et al., Archaeological Prospection (2023), retracted 2024", "Retraction notice, Archaeological Prospection (20 March 2024)"],
    img: { key: "padang", alt: "Fallen and standing columnar stones on a grassy terrace at Gunung Padang", credit: "Mohammad Fadli", lic: "CC BY-SA 3.0", file: "Gunung_Padang_Site.jpg", caption: "Upper terrace, Gunung Padang" }
  },
  {
    id: "nazca", slug: "nazca-lines", name: "The Nazca lines", place: "Ica, Peru", lat: -14.716, lon: -75.13, earth: [-14.7, -75.14, 500, 8000, 0, 30],
    era: "c. 500 BCE – 500 CE", gap: "Still being found", kind: "watch",
    lede: "Giant figures drawn on the desert floor, and new ones are still turning up.",
    known: "The Nazca people made geoglyphs by clearing dark stones from lighter ground. An AI-assisted survey published in 2024 found 303 new figurative geoglyphs in six months, nearly doubling the number known (Sakai et al., PNAS).",
    missing: "A settled answer to what they were for. Ideas include ritual walking paths, water and fertility, and astronomy; the calendar theory has little support.",
    question: "What were the lines for, and how many are still unfound?",
    sources: ["Sakai et al., PNAS 121 (2024)", "Reiche, Mystery on the Desert (1968)"],
    img: { key: "nazca", alt: "Aerial photo of the Nazca monkey geoglyph with its spiral tail", credit: "Unknown", lic: "Public domain", file: "Nazca_monkey.jpg", caption: "The monkey geoglyph", fit: "contain" }
  },
  {
    id: "mohenjo", slug: "mohenjo-daro", name: "Mohenjo-daro", place: "Sindh, Pakistan", lat: 27.329, lon: 68.138, earth: [27.329, 68.1386, 50, 2000, 0, 45],
    era: "Indus civilisation, c. 2500 – 1900 BCE", gap: "Undeciphered script", kind: "watch",
    lede: "A planned city with drains and a great bath, and a script no one can read.",
    known: "Mohenjo-daro had grid streets, covered drains and the Great Bath, and thrived around 2500–1900 BCE as one of the largest cities of its age. Thousands of short inscriptions, mostly on seals, survive in the Indus script.",
    missing: "A bilingual text, or any long inscription. The average inscription is about five signs, too short for most decipherment methods.",
    question: "What language did the Indus people speak, and what do the signs say?",
    spec: "Whether the signs encode language at all is debated (Farmer, Sproat & Witzel 2004; Rao et al. 2009). No claimed decipherment has won wide acceptance.",
    sources: ["Possehl, The Indus Civilization (2002)", "Farmer, Sproat & Witzel, EJVS 11 (2004)", "Rao et al., Science 324 (2009)"],
    img: { key: "mohenjo", alt: "The brick-lined Great Bath of Mohenjo-daro with the stupa mound behind", credit: "Saqib Qayyum", lic: "CC BY-SA 3.0", file: "Mohenjo-daro.jpg", caption: "The Great Bath and the stupa mound" }
  },
  {
    id: "dogger", slug: "doggerland", name: "Doggerland", place: "North Sea", lat: 54.5, lon: 2.5, earth: [54.5, 2.5, 0, 600000, 0, 0],
    era: "Drowned c. 10,000 – 7,000 years ago", gap: "Drowned landscape", kind: "watch",
    lede: "A country of hills, rivers and people, now under the North Sea.",
    known: "As the ice sheets melted, rising seas cut Britain off from the continent. Doggerland shrank to an archipelago, and the Storegga tsunami about 8,150 years ago struck what remained (Walker et al. 2020). Trawlers have pulled up worked bone and antler, such as the Colinda harpoon in 1931.",
    missing: "Almost everything. Settlements, burials and the people who lived there lie under the seabed.",
    question: "Who lived in Doggerland, and what survives beneath the sediment?",
    sources: ["Walker et al., Antiquity 94 (2020)", "Gaffney et al., Europe's Lost Frontiers project"],
    img: { key: "dogger", alt: "Four maps showing Doggerland shrinking from 10,000 to 7,000 years ago", credit: "James Walker, Vincent Gaffney, Simon Fitch, Merle Muru, Andrew Fraser, Martin Bates & Richard Bates", lic: "CC BY 4.0", file: "Doggerland.png", caption: "Doggerland from 10,000 to 7,000 years ago", fit: "contain", light: true }
  },
  {
    id: "vostok", slug: "lake-vostok", name: "Lake Vostok", place: "East Antarctica", lat: -77.5, lon: 106.0, earth: [-77.5, 106.0, 3500, 450000, 0, 0],
    era: "Sealed under the ice for perhaps 15 million years", gap: "Unsampled water", kind: "watch",
    lede: "A lake the size of Lake Ontario, sealed under nearly 4 km of ice, cut off from the air for millions of years.",
    known: "Beneath Russia's Vostok Station, under 3.7 to 4 km of ice, lies a liquid lake about 250 km long, the largest of some 400 lakes found under Antarctica. It may have been cut off from the air for 15 million years or more. Russian drilling reached its surface in February 2012.",
    missing: "A clean sample of the lake itself. Lake water rose into the borehole, froze and mixed with drilling fluid. Reports of microbial DNA, including thousands of gene sequences in 2013 (Shtarkman et al.), are disputed as possible contamination.",
    question: "Is anything living in Lake Vostok, and what does its water remember of Earth's past?",
    legends: [
      { h: "What's under the ice", p: "Online lore puts hidden bases, strange anomalies and the ruins of a lost civilisation beneath the Antarctic ice, and asks why drilling here is so tightly controlled." },
      { h: "The other side", p: "A real magnetic anomaly runs along the lake's eastern shore; geologists read it as a boundary in the crust beneath. Drilling is slow because the lake must not be contaminated. We have seen no evidence of anything built." }
    ],
    sources: ["Siegert et al., Nature 414 (2001)", "Shtarkman et al., PLoS ONE 8 (2013)", "Studinger et al., Earth and Planetary Science Letters (2003)"],
    img: { key: "vostok", alt: "Radar satellite view of the smooth surface over Lake Vostok in the Antarctic ice", credit: "NASA Goddard Space Flight Center, Canadian Space Agency, RADARSAT", lic: "Public domain", file: "Lake_Vostok_NASA.jpg", caption: "The ice over Lake Vostok, seen by RADARSAT" }
  }
];
