// Banco de dados curado e seletivo de filmes para o CineMatch
const MOVIE_DATABASE = [
  {
    "id": "sf-1",
    "title": "Interestelar",
    "year": 2014,
    "genres": [
      "Ficção Científica",
      "Drama"
    ],
    "rating": 8.7,
    "duration": "2h 49m",
    "director": "Christopher Nolan",
    "synopsis": "Uma equipe de exploradores viaja através de um buraco de minhoca no espaço em uma tentativa de garantir a sobrevivência da humanidade em uma Terra agonizante.",
    "platforms": [
      "Prime Video",
      "Max"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/6ricSDD83BClJsFdGB6x7cM0MFQ.jpg"
  },
  {
    "id": "sf-2",
    "title": "A Chegada",
    "year": 2016,
    "genres": [
      "Ficção Científica",
      "Mistério"
    ],
    "rating": 7.9,
    "duration": "1h 56m",
    "director": "Denis Villeneuve",
    "synopsis": "Uma linguista trabalha com os militares para aprender a se comunicar com formas de vida alienígenas depois que doze naves misteriosas aparecem ao redor do mundo.",
    "platforms": [
      "Netflix",
      "Prime Video"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/3rDwbFpn6z5HJUgDjpfhEePx8VI.jpg"
  },
  {
    "id": "sf-3",
    "title": "Blade Runner 2049",
    "year": 2017,
    "genres": [
      "Ficção Científica",
      "Ação"
    ],
    "rating": 8,
    "duration": "2h 44m",
    "director": "Denis Villeneuve",
    "synopsis": "Um novo blade runner, o policial K do LAPD, descobre um segredo há muito enterrado que tem o potencial de mergulhar o que resta da sociedade no caos absoluto.",
    "platforms": [
      "Prime Video",
      "Netflix"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/49pANIZXRAdHUiWjjBv4vxPeqRC.jpg"
  },
  {
    "id": "sf-4",
    "title": "Matrix",
    "year": 1999,
    "genres": [
      "Ficção Científica",
      "Ação"
    ],
    "rating": 8.7,
    "duration": "2h 16m",
    "director": "Lana Wachowski, Lilly Wachowski",
    "synopsis": "Quando um belo estranho leva o programador de computador Neo a um submundo proibido, ele descobre a verdade chocante: a vida que ele conhece é uma simulação de IA.",
    "platforms": [
      "Max",
      "Prime Video"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/lDqMDI3xpbB9UQRyeXfei0MXhqb.jpg"
  },
  {
    "id": "sf-5",
    "title": "Duna: Parte Dois",
    "year": 2024,
    "genres": [
      "Ficção Científica",
      "Aventura"
    ],
    "rating": 8.6,
    "duration": "2h 46m",
    "director": "Denis Villeneuve",
    "synopsis": "Paul Atreides se une a Chani e aos Fremen em busca de vingança contra os conspiradores que destruíram sua família, enquanto tenta evitar um futuro terrível que só ele prevê.",
    "platforms": [
      "Max"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/8LJJjLjAzAwXS40S5mx79PJ2jSs.jpg"
  },
  {
    "id": "sf-6",
    "title": "Perdido em Marte",
    "year": 2015,
    "genres": [
      "Ficção Científica",
      "Aventura"
    ],
    "rating": 8,
    "duration": "2h 21m",
    "director": "Ridley Scott",
    "synopsis": "Um astronauta fica preso em Marte após ser dado como morto por sua equipe e precisa usar toda sua inteligência e ciência para sobreviver e sinalizar socorro à Terra.",
    "platforms": [
      "Disney+"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/fG3S4zdgnsaF77tJGK3rA9tHBu4.jpg"
  },
  {
    "id": "sf-7",
    "title": "Coerência",
    "year": 2013,
    "genres": [
      "Ficção Científica",
      "Suspense"
    ],
    "rating": 7.2,
    "duration": "1h 29m",
    "director": "James Ward Byrkit",
    "synopsis": "Coisas terrivelmente bizarras começam a acontecer quando um grupo de amigos se reúne para jantar na mesma noite em que um cometa misterioso passa muito perto da Terra.",
    "platforms": [
      "Prime Video"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/txGO6noaRTUDf6efsUZrsPIxrmR.jpg"
  },
  {
    "id": "sf-8",
    "title": "Tudo em Todo Lugar ao Mesmo Tempo",
    "year": 2022,
    "genres": [
      "Ficção Científica",
      "Ação",
      "Aventura"
    ],
    "rating": 8.1,
    "duration": "2h 19m",
    "director": "Daniel Kwan, Daniel Scheinert",
    "synopsis": "Uma dona de lavanderia sobrecarregada é arrastada para uma aventura insana pelo multiverso, onde precisa canalizar os poderes de suas outras versões para salvar a realidade.",
    "platforms": [
      "Prime Video"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/2dSZQGwijlXvMSyuGe0FSgrXnv0.jpg"
  },
  {
    "id": "h-1",
    "title": "Corra!",
    "year": 2017,
    "genres": [
      "Terror",
      "Suspense"
    ],
    "rating": 7.8,
    "duration": "1h 44m",
    "director": "Jordan Peele",
    "synopsis": "Um jovem negro visita a propriedade da família de sua namorada branca. Inicialmente amigáveis, os comportamentos peculiares dos moradores escondem um segredo sombrio.",
    "platforms": [
      "Netflix",
      "Prime Video"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/A0RoSZh8PEYJgDMgM2EV7Ycz3dR.jpg"
  },
  {
    "id": "h-2",
    "title": "Um Lugar Silencioso",
    "year": 2018,
    "genres": [
      "Terror",
      "Ficção Científica"
    ],
    "rating": 7.5,
    "duration": "1h 30m",
    "director": "John Krasinski",
    "synopsis": "Em um mundo pós-apocalíptico assolado por monstros cegos de audição ultra-sensível, uma família luta para sobreviver mantendo silêncio absoluto a qualquer custo.",
    "platforms": [
      "Netflix",
      "Prime Video"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/jk1LYcbiuUr0tv37cVcmp4u9KcN.jpg"
  },
  {
    "id": "h-3",
    "title": "Hereditário",
    "year": 2018,
    "genres": [
      "Terror",
      "Drama"
    ],
    "rating": 7.3,
    "duration": "2h 07m",
    "director": "Ari Aster",
    "synopsis": "Após a morte da avó matriarca, a família Graham começa a ser assombrada por acontecimentos bizarros e desvenda segredos terríveis de sua árvore genealógica.",
    "platforms": [
      "Netflix",
      "Max"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/wonYMeHauhrxSi5UTOtj5L479mS.jpg"
  },
  {
    "id": "h-4",
    "title": "Fale Comigo",
    "year": 2022,
    "genres": [
      "Terror",
      "Mistério"
    ],
    "rating": 7.1,
    "duration": "1h 35m",
    "director": "Danny Philippou, Michael Philippou",
    "synopsis": "Um grupo de adolescentes descobre que pode falar com os mortos usando uma misteriosa mão embalsamada. A brincadeira vira um pesadelo quando quebram a principal regra.",
    "platforms": [
      "Prime Video"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/7U3lC4YnHD8zpeoxbY6Hsj9jyeu.jpg"
  },
  {
    "id": "h-5",
    "title": "Invocação do Mal",
    "year": 2013,
    "genres": [
      "Terror",
      "Mistério"
    ],
    "rating": 7.5,
    "duration": "1h 52m",
    "director": "James Wan",
    "synopsis": "Os renomados demonologistas Ed e Lorraine Warren são chamados para ajudar uma família atormentada por uma entidade satânica extremamente agressiva em sua nova fazenda.",
    "platforms": [
      "Max",
      "Prime Video"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/1NxHKZW5DPbUFtbF3MxbdSyxRqU.jpg"
  },
  {
    "id": "h-6",
    "title": "O Homem Invisível",
    "year": 2020,
    "genres": [
      "Terror",
      "Ficção Científica",
      "Suspense"
    ],
    "rating": 7.1,
    "duration": "2h 04m",
    "director": "Leigh Whannell",
    "synopsis": "Após fugir de um relacionamento abusivo e receber a notícia do suicídio do ex, Cecilia começa a sentir que está sendo vigiada e caçada por alguém que ninguém consegue ver.",
    "platforms": [
      "Prime Video"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/yBuFgcE4bJlc20h7vblF1bW4dW4.jpg"
  },
  {
    "id": "h-7",
    "title": "A Bruxa",
    "year": 2015,
    "genres": [
      "Terror",
      "Histórico"
    ],
    "rating": 6.9,
    "duration": "1h 32m",
    "director": "Robert Eggers",
    "synopsis": "Na Nova Inglaterra de 1630, uma família puritana expulsa de sua comunidade se estabelece à beira de uma floresta escura, onde forças sobrenaturais e paranoia começam a consumi-los.",
    "platforms": [
      "Prime Video",
      "Netflix"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/yGtYuBzEkGGoUbM9zRpadoDN6KD.jpg"
  },
  {
    "id": "h-8",
    "title": "Midsommar",
    "year": 2019,
    "genres": [
      "Terror",
      "Drama"
    ],
    "rating": 7.1,
    "duration": "2h 28m",
    "director": "Ari Aster",
    "synopsis": "Um casal em crise viaja com amigos para uma comunidade isolada na Suécia para um festival de solstício de verão. A viagem idílica logo se transforma em um bizarro ritual pagão.",
    "platforms": [
      "Prime Video"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/hR4dXPlWq5Nekwjqbp3gFGeiiZS.jpg"
  },
  {
    "id": "a-1",
    "title": "Mad Max: Estrada da Fúria",
    "year": 2015,
    "genres": [
      "Ação",
      "Aventura",
      "Ficção Científica"
    ],
    "rating": 8.1,
    "duration": "2h 00m",
    "director": "George Miller",
    "synopsis": "Em um futuro pós-apocalíptico desértico, o andarilho Max une forças com a Imperatriz Furiosa e um grupo de prisioneiras em uma fuga desesperada de um cruel senhor da guerra.",
    "platforms": [
      "Max",
      "Prime Video"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/tH64gzAHDFg7EFcgfkkZyHdGM5P.jpg"
  },
  {
    "id": "a-2",
    "title": "Batman: O Cavaleiro das Trevas",
    "year": 2008,
    "genres": [
      "Ação",
      "Policial",
      "Drama"
    ],
    "rating": 9,
    "duration": "2h 32m",
    "director": "Christopher Nolan",
    "synopsis": "Com a ajuda de Jim Gordon e Harvey Dent, Batman mantém o crime sob controle em Gotham. No entanto, a chegada do Coringa instaura uma onda de anarquia sem precedentes.",
    "platforms": [
      "Max"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/4lj1ikfsSmMZNyfdi8R8Tv5tsgb.jpg"
  },
  {
    "id": "a-3",
    "title": "John Wick 4: Baba Yaga",
    "year": 2023,
    "genres": [
      "Ação",
      "Suspense"
    ],
    "rating": 7.7,
    "duration": "2h 49m",
    "director": "Chad Stahelski",
    "synopsis": "John Wick descobre um caminho para derrotar a Alta Cúpula e recuperar sua liberdade. Mas a recompensa por sua cabeça aumenta, forçando-o a lutar contra aliados mundiais.",
    "platforms": [
      "Prime Video"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/rXTqhpkpj6E0YilQ49PK1SSqLhm.jpg"
  },
  {
    "id": "a-4",
    "title": "Top Gun: Maverick",
    "year": 2022,
    "genres": [
      "Ação",
      "Drama"
    ],
    "rating": 8.2,
    "duration": "2h 10m",
    "director": "Joseph Kosinski",
    "synopsis": "Após décadas de serviço, o piloto de testes Pete 'Maverick' Mitchell é convocado para treinar um destacamento de pilotos graduados da Top Gun para uma missão suicida especializada.",
    "platforms": [
      "Netflix",
      "Prime Video"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/kPbuLGVSJHATkW9fX9L3h1wM0Pa.jpg"
  },
  {
    "id": "a-5",
    "title": "Homem-Aranha: No Aranhaverso",
    "year": 2018,
    "genres": [
      "Ação",
      "Animação",
      "Aventura"
    ],
    "rating": 8.4,
    "duration": "1h 57m",
    "director": "Bob Persichetti, Peter Ramsey, Rodney Rothman",
    "synopsis": "O jovem Miles Morales é picado por uma aranha radioativa e assume o manto do Homem-Aranha. Ele logo descobre que a colisão de universos trouxe outras cinco versões do herói.",
    "platforms": [
      "Disney+",
      "Prime Video"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/gte2cJ3mtc2I8hZyXwRTzyclKuC.jpg"
  },
  {
    "id": "a-6",
    "title": "Em Ritmo de Fuga",
    "year": 2017,
    "genres": [
      "Ação",
      "Policial",
      "Musical"
    ],
    "rating": 7.6,
    "duration": "1h 53m",
    "director": "Edgar Wright",
    "synopsis": "Baby, um jovem piloto de fuga talentoso que depende do ritmo de sua trilha sonora pessoal para ser o melhor, é forçado a participar de um assalto fadado ao fracasso.",
    "platforms": [
      "Netflix",
      "Prime Video"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/1rYTtQ14rPB3KOgk5TjkUqiQFch.jpg"
  },
  {
    "id": "a-7",
    "title": "Missão: Impossível - Acerto de Contas",
    "year": 2023,
    "genres": [
      "Ação",
      "Aventura"
    ],
    "rating": 7.7,
    "duration": "2h 43m",
    "director": "Christopher McQuarrie",
    "synopsis": "Ethan Hunt e a equipe do IMF embarcam em sua missão mais perigosa: rastrear uma inteligência artificial rebelde e devastadora antes que caia nas mãos erradas.",
    "platforms": [
      "Prime Video",
      "Netflix"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/hBKxN5Z8gRo2am0whMeQlPv19K4.jpg"
  },
  {
    "id": "a-8",
    "title": "Gladiador",
    "year": 2000,
    "genres": [
      "Ação",
      "Histórico",
      "Drama"
    ],
    "rating": 8.5,
    "duration": "2h 35m",
    "director": "Ridley Scott",
    "synopsis": "Um general romano traído pelo filho do imperador, que assassinou sua família, busca vingança tornando-se um gladiador implacável nas arenas sangrentas de Roma.",
    "platforms": [
      "Prime Video",
      "Netflix"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/4DUClyGA6OqjXv6yC0Imf6THGfp.jpg"
  },
  {
    "id": "ad-1",
    "title": "O Senhor dos Anéis: A Sociedade do Anel",
    "year": 2001,
    "genres": [
      "Aventura",
      "Fantasia"
    ],
    "rating": 8.8,
    "duration": "2h 58m",
    "director": "Peter Jackson",
    "synopsis": "Um jovem hobbit herda um anel incrivelmente poderoso e, acompanhado por um mago, elfos, anões e homens, inicia uma jornada épica para destruí-lo na Montanha da Perdição.",
    "platforms": [
      "Max",
      "Prime Video"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/tlvsNCwWEIgwAM23aNzTmMIcPEZ.jpg"
  },
  {
    "id": "ad-2",
    "title": "Avatar: O Caminho da Água",
    "year": 2022,
    "genres": [
      "Aventura",
      "Ficção Científica",
      "Ação"
    ],
    "rating": 7.6,
    "duration": "3h 12m",
    "director": "James Cameron",
    "synopsis": "Jake Sully e Ney'tiri criaram uma família em Pandora, mas uma antiga ameaça ressurge, forçando-os a fugir e buscar refúgio com as tribos aquáticas do oceano.",
    "platforms": [
      "Disney+"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/hm6nONQOgVpKmRK5YUX9EqfJ0NH.jpg"
  },
  {
    "id": "ad-3",
    "title": "A Viagem de Chihiro",
    "year": 2001,
    "genres": [
      "Aventura",
      "Animação",
      "Fantasia"
    ],
    "rating": 8.6,
    "duration": "2h 05m",
    "director": "Hayao Miyazaki",
    "synopsis": "Durante a mudança de sua família, a jovem Chihiro de 10 anos entra acidentalmente em um mundo espiritual governado por uma bruxa, onde seus pais são transformados em porcos.",
    "platforms": [
      "Netflix"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/ivHwYw3b03dFqRkcqaDSxjj2LQT.jpg"
  },
  {
    "id": "ad-4",
    "title": "Os Caçadores da Arca Perdida",
    "year": 1981,
    "genres": [
      "Aventura",
      "Ação"
    ],
    "rating": 8.4,
    "duration": "1h 55m",
    "director": "Steven Spielberg",
    "synopsis": "Em 1936, o arqueólogo e aventureiro de chapéu e chicote Indiana Jones corre contra agentes nazistas para encontrar a lendária Arca da Aliança, que possui poderes bíblicos.",
    "platforms": [
      "Disney+"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/mtf7iKZRdsL6qbbCnd2TAxOfJYg.jpg"
  },
  {
    "id": "ad-5",
    "title": "Jurassic Park",
    "year": 1993,
    "genres": [
      "Aventura",
      "Ficção Científica"
    ],
    "rating": 8.2,
    "duration": "2h 07m",
    "director": "Steven Spielberg",
    "synopsis": "Um paleontólogo e seus convidados visitam um novo parque temático de dinossauros clonados, mas o caos se instala quando um sabotador sabota os sistemas de segurança do local.",
    "platforms": [
      "Prime Video",
      "Netflix"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/mgjJ7FH4V3exsmoHwXrmsUhn0h1.jpg"
  },
  {
    "id": "ad-6",
    "title": "Piratas do Caribe: A Maldição do Pérola Negra",
    "year": 2003,
    "genres": [
      "Aventura",
      "Fantasia",
      "Ação"
    ],
    "rating": 8.1,
    "duration": "2h 23m",
    "director": "Gore Verbinski",
    "synopsis": "O ferreiro Will Turner une forças com o excêntrico capitão pirata Jack Sparrow para resgatar sua amada sequestrada pela tripulação maldita de piratas fantasmas.",
    "platforms": [
      "Disney+"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/9Xcg7Ar4ketv4rl8yeK32yp9zQA.jpg"
  },
  {
    "id": "ad-7",
    "title": "Dungeons & Dragons: Honra Entre Rebeldes",
    "year": 2023,
    "genres": [
      "Aventura",
      "Fantasia",
      "Comédia"
    ],
    "rating": 7.2,
    "duration": "2h 14m",
    "director": "John Francis Daley, Jonathan Goldstein",
    "synopsis": "Um bardo charmoso e um grupo de aventureiros improváveis planejam um assalto épico para recuperar uma relíquia perdida e salvar sua filha das mãos de um mago maligno.",
    "platforms": [
      "Prime Video",
      "Netflix"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/tt23D7Mkg0dHhsWn3aN0hbslaFw.jpg"
  },
  {
    "id": "ad-8",
    "title": "Up: Altas Aventuras",
    "year": 2009,
    "genres": [
      "Aventura",
      "Animação",
      "Família"
    ],
    "rating": 8.3,
    "duration": "1h 36m",
    "director": "Pete Docter, Bob Peterson",
    "synopsis": "Um viúvo idoso realiza o sonho de sua vida de flutuar sua casa para a América do Sul com milhares de balões, mas acidentalmente leva consigo um tagarela escoteiro de 8 anos.",
    "platforms": [
      "Disney+"
    ],
    "poster": "https://media.themoviedb.org/t/p/w500/oo5gvGDIiPwbXc3R0snZIuOc517.jpg"
  }
];
