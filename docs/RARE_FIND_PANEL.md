# Rare Find research panel

The default pack uses Briony Banks and Louise Connell’s UK category production norms. Each of these categories was answered by 20 people. Participants had 60 seconds to list responses. The count measures how many named an item anywhere in their list. It measures this particular panel and task, rather than the proportion of the population who know a fact.

[Paper](https://doi.org/10.3758/s13428-021-01787-z) · [Data](https://osf.io/jgcu6/) · [Referential item-level CSV](https://osf.io/download/nz38s/) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

The nine categories and 181 answer-category entries in rare-panel-data.json are a curated extract. Category keys and count keys match the CSV’s category and category.member. Counts come from prod.freq. Each row was checked against prod.freq.percent using 20 participants. The source CSV SHA-256 is 9c22790b601a9531a331a550a71be4e5fe584946c4a5722fd49db42bd51a2ada. Prompts, aliases and scoring are Jambaloop adaptations. Some survey responses were incorrect or ambiguous. Only the selected answers receive an automatic rating.

A correct measured answer earns 20 + round(180 × (1 − mentions / 20)) points. The host can match a spelling to its canonical answer. An accepted unmeasured answer earns the 20-point base, with no claim about its frequency. Two or more matching canonical submissions each lose five points once. Distinct answers with the same measured frequency have the same value. Invalid answers earn zero. Team standings use the average cumulative score per member.

The optional room-scoring game continues to award 200 / 100 / 50 points by group size and uses its original answer bank.
