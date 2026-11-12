# Shrek Trigger technique catalogue

This is the locked **design target** for all 116 techniques: 56 singles, 45 doubles and 15 triples. It supersedes earlier names and presentation plans in this file. `content/techs.json` and the implementation notes track native implementation and acceptance status. The November 2 design lock rejects the later all-custom-combo and Milk/Milk 2 experiments.

## Revision rules

- **November 11 amendment:** technique names, art and mechanics may now change for a joke (see `docs/decisions.md`, "Funny techniques and joke mechanics"); `content/techs.json` is the current catalogue where it differs from this document.
- **Stock magic stays stock, except Swamp Belch and Hot Sauce.** Elemental spells, healing/revival/status magic and magical combinations retain their original Chrono Trigger names, animations and mechanics. This applies to party members, enemies and shared animation resources. Luminaire becomes **Swamp Belch**, with the native fart cloud and original Air mechanics. Flare becomes **Hot Sauce**, with Donkey's native chili-bottle effect and Flare's original damage, 20 MP cost, targets and progression.
- **Character-driven physical techniques can be custom.** These retain their native damage, costs, targeting, progression and combination mechanics unless an explicit exception below says otherwise.
- **Puss and Mongo exchange Charm and Heal.** Puss receives Charm in his old Heal slot, using Ayla's steal mechanics. Mongo receives Heal in his old Charm slot, using Frog's party-healing mechanics.
- **Puss's Cure II becomes Nine Lives.** It heals a living ally with Cure II strength and revives a fallen ally with Life II-equivalent restoration. It retains the Cure II slot, unlock and MP cost.
- **Four combination participants move with those skills:** Double Cure becomes Fiona + Mongo, Twin Charm becomes Fiona + Puss, Cure Wave becomes Pinocchio + Mongo, and Boogie becomes Pinocchio + Puss. Their native IDs and underlying combination effects stay intact, and every ordinary pair still has three doubles.

The resulting scope is **77 stock techniques and 39 custom or explicitly modified techniques**. “Stock magic” below always means the original name, animation and mechanics, not merely unchanged damage.

## Shrek singles

| ID | Native source | Target name | Target presentation and mechanics |
| --- | --- | --- | --- |
| 1 | Cyclone | **Fart** | Custom triple-speed spin and gas; source damage/targets/2 MP; 25% poison respecting immunity. |
| 2 | Slash | **Eye Lasers** | Custom paired eye beams and brief target flames; source line/Air/2 MP; no burn status. |
| 3 | Lightning | **Lightning** | Stock magic. |
| 4 | Spincut | **Swamp Piledriver** | Custom grab/jump/somersault/slam; anchored large targets; source physical mechanics. |
| 5 | Lightning II | **Lightning II** | Stock magic. |
| 6 | Life | **Life** | Stock magic. |
| 7 | Confuse | **Four Layer Slam** | Custom three body blows and finishing throw; source four hits/12 MP; anchored large targets. |
| 8 | Luminaire | **Swamp Belch** | Custom giant translucent fart cloud with native expansion, rise and dissipation; source Air damage, all-enemy targets and 20 MP. |

Earlier Ogre Roar, Storm Breath and Get Up presentations are superseded design experiments, not targets for the finished game. Swamp Belch is retained at the user's explicit direction.

## Fiona singles

All eight are stock magic with their original names, animations and mechanics.

| ID | Native source | Target name |
| --- | --- | --- |
| 9 | Aura | **Aura** |
| 10 | Provoke | **Provoke** |
| 11 | Ice | **Ice** |
| 12 | Cure | **Cure** |
| 13 | Haste | **Haste** |
| 14 | Ice II | **Ice II** |
| 15 | Cure II | **Cure II** |
| 16 | Life II | **Life II** |

## Donkey singles

The first seven are stock magical or gadget-spell presentations with their original names, animations and mechanics. Hot Sauce is the explicit Flare exception.

| ID | Native source | Target name |
| --- | --- | --- |
| 17 | Flame Toss | **Flame Toss** |
| 18 | Hypno Wave | **Hypno Wave** |
| 19 | Fire | **Fire** |
| 20 | Napalm | **Napalm** |
| 21 | Protect | **Protect** |
| 22 | Fire II | **Fire II** |
| 23 | Mega Bomb | **Mega Bomb** |
| 24 | Flare | **Call My Wife** | Dragon fills the sky over the battlefield (Luminaire's scene, generated picture); source Flare damage, 20 MP cost, targets and progression. Fire II (22) is now **Hot Sauce**. |

## Pinocchio singles

| ID | Native source | Target name | Target presentation and mechanics |
| --- | --- | --- | --- |
| 25 | Rocket Punch | **Nose Job** | Custom extending-nose strike; source physical mechanics. |
| 26 | Cure Beam | **Cure Beam** | Stock magic. |
| 27 | Laser Spin | **Laser Spin** | Stock magic. |
| 28 | Robo Tackle | **Timber!** | Custom full-body wooden shoulder charge; source physical mechanics. |
| 29 | Heal Beam | **Heal Beam** | Stock magic. |
| 30 | Uzzi Punch | **Wood Chipper** | Custom rapid hinged-arm punches; source physical mechanics. |
| 31 | Area Bomb | **Area Bomb** | Stock magic. |
| 32 | Shock | **Shock** | Stock magic. |

## Puss in Boots singles

| ID | Native source | Target name | Target presentation and mechanics |
| --- | --- | --- | --- |
| 33 | Slurp | **Cat Kiss** | Custom affectionate cat-kiss presentation; original Slurp healing, cost and targeting. |
| 34 | Slurp Cut | **Hook & Whisker** | Custom cape/hook fencing strike; source physical mechanics and footprint. |
| 35 | Water | **Water** | Stock magic. |
| 36 | Heal slot / Ayla's Charm | **Charm** | Custom oversized, glistening big-eyes plea with a shy blink and delighted reaction on success; Ayla's Charm cost, steal rules and restrictions replace Frog's Heal in this slot. |
| 37 | Leap Slash | **Flying Fur** | Custom airborne fencing attack; source physical mechanics. |
| 38 | Water II | **Water II** | Stock magic. |
| 39 | Cure II | **Nine Lives** | Custom single-ally restoration: Cure II healing for a living ally or Life II-equivalent revival for a fallen ally; retains Cure II unlock and MP cost. |
| 40 | Frog Squash | **Yarn Bomb** | Custom bouncing yarn-ball presentation; source all-enemy physical damage and low-HP scaling. |

## Mongo singles

| ID | Native source | Target name | Target presentation and mechanics |
| --- | --- | --- | --- |
| 41 | Kiss | **Kiss** | Stock magic. |
| 42 | Rollo Kick | **Ginger Roll** | Custom rolling gingerbread kick; source physical mechanics. |
| 43 | Cat Attack | **Crumb & Punishment** | Custom crumb-scattering scratch sequence; source physical mechanics. |
| 44 | Rock Throw | **Dough Hurl** | Custom lift-and-hurl presentation; original target restrictions and physical mechanics. |
| 45 | Charm slot / Frog's Heal | **Heal** | Stock Frog Heal name, animation, party-healing effect, cost and restrictions in Mongo's old Charm slot. |
| 46 | Tail Spin | **Crumb Cyclone** | Custom heavy cookie spin; source area/physical mechanics. |
| 47 | Dino Tail | **Last Crumb** | Custom giant-cookie desperation attack; source low-HP scaling. |
| 48 | Triple Kick | **My Buttons!** | Custom three-stomp sequence; source physical mechanics. |

## Lord Farquaad singles

All eight are stock magic with their original names, animations and mechanics.

| ID | Native source | Target name |
| --- | --- | --- |
| 49 | Lightning II | **Lightning II** |
| 50 | Ice II | **Ice II** |
| 51 | Fire II | **Fire II** |
| 52 | Dark Bomb | **Dark Bomb** |
| 53 | Magic Wall | **Magic Wall** |
| 54 | Dark Mist | **Dark Mist** |
| 55 | Black Hole | **Black Hole** |
| 56 | Dark Matter | **Dark Matter** |

## Double techniques

### Shrek + Fiona

| ID | Native source | Target name | Presentation |
| --- | --- | --- | --- |
| 57 | Aura Whirl | **Aura Whirl** | Stock magic. |
| 58 | Ice Sword | **Ice Sword** | Stock magic. |
| 59 | Ice Sword II | **Ice Sword II** | Stock magic. |

### Shrek + Donkey

| ID | Native source | Target name | Presentation |
| --- | --- | --- | --- |
| 60 | Fire Whirl | **Fire Whirl** | Stock magic. |
| 61 | Fire Sword | **Fire Sword** | Stock magic. |
| 62 | Fire Sword II | **Fire Sword II** | Stock magic. |

### Shrek + Pinocchio

| ID | Native source | Target name | Presentation |
| --- | --- | --- | --- |
| 63 | Rocket Roll | **Ogre Carousel** | Custom rotating wooden battering ram; source mechanics. |
| 64 | Max Cyclone | **Timber Tornado** | Custom broad spinning launch; source mechanics. |
| 65 | Super Volt | **Super Volt** | Stock magic. |

### Shrek + Puss

| ID | Native source | Target name | Presentation |
| --- | --- | --- | --- |
| 66 | X Strike | **Cross Purr-poses** | Custom crossing ogre/rapier strikes; source mechanics. |
| 67 | Sword Stream | **Sword Stream** | Stock magic. |
| 68 | Spire | **Spire** | Stock magic. |

### Shrek + Mongo

| ID | Native source | Target name | Presentation |
| --- | --- | --- | --- |
| 69 | Drill Kick | **Cookie Drill** | Custom launched drilling kick; source mechanics. |
| 70 | Volt Bite | **Volt Bite** | Stock magic. |
| 71 | Falcon Hit | **Swamp Airlift** | Custom high-speed aerial slam; source line targets and mechanics. |

### Fiona + Donkey

| ID | Native source | Target name | Presentation |
| --- | --- | --- | --- |
| 72 | Antipode | **Antipode** | Stock magic. |
| 73 | Antipode II | **Antipode II** | Stock magic. |
| 74 | Antipode III | **Antipode III** | Stock magic. |

### Fiona + Pinocchio

| ID | Native source | Target name | Presentation |
| --- | --- | --- | --- |
| 75 | Aura Beam | **Aura Beam** | Stock magic. |
| 76 | Ice Tackle | **Ice Tackle** | Stock magic. |
| 77 | Cure Touch | **Cure Touch** | Stock magic. |

### Fiona + Puss

| ID | Native source | Target name | Presentation |
| --- | --- | --- | --- |
| 78 | Ice Water | **Ice Water** | Stock magic. |
| 79 | Glacier | **Glacier** | Stock magic. |
| 81 | Twin Charm | **Purrfect Heist** | Fiona distracts while Puss steals; native Twin Charm effect with its participants moved to Fiona + Puss. |

### Fiona + Mongo

| ID | Native source | Target name | Presentation |
| --- | --- | --- | --- |
| 80 | Double Cure | **Double Cure** | Stock magic; participants move to Fiona + Mongo so Mongo's Heal supports the combination. |
| 82 | Ice Toss | **Ice Toss** | Stock magic. |
| 83 | Cube Toss | **Cube Toss** | Stock magic. |

### Donkey + Pinocchio

| ID | Native source | Target name | Presentation |
| --- | --- | --- | --- |
| 84 | Fire Punch | **Fire Punch** | Stock magic. |
| 85 | Fire Tackle | **Fire Tackle** | Stock magic. |
| 86 | DoublevBomb | **DoublevBomb** | Stock magic. |

### Donkey + Mongo

| ID | Native source | Target name | Presentation |
| --- | --- | --- | --- |
| 87 | Flame Kick | **Flame Kick** | Stock magic. |
| 88 | Flame Whirl | **Fire Whirl** | Stock native name, animation and mechanics. |
| 89 | Blaze Kick | **Blaze Kick** | Stock magic. |

### Pinocchio + Puss

| ID | Native source | Target name | Presentation |
| --- | --- | --- | --- |
| 90 | Blade Toss | **String Fencing** | Custom puppet-string rapier attack; source mechanics. |
| 91 | Bubble Snap | **Bubble Snap** | Stock magic. |
| 93 | Boogie | **Cat's Cradle** | Custom puppet-and-cat dance; native Boogie status effect with participants moved to Pinocchio + Puss. |

### Pinocchio + Mongo

| ID | Native source | Target name | Presentation |
| --- | --- | --- | --- |
| 92 | Cure Wave | **Cure Wave** | Stock magic; participants move to Pinocchio + Mongo so Mongo's Heal supports the combination. |
| 94 | Spin Kick | **Cookie Lathe** | Custom rotating cookie kick; source mechanics. |
| 95 | Beast Toss | **Cookie Catapult** | Custom wood-and-gingerbread toss; source mechanics. |

### Puss + Mongo

| ID | Native source | Target name | Presentation |
| --- | --- | --- | --- |
| 96 | Slurp Kiss | **Slurp Kiss** | Stock magic, combining Puss's healing-kiss role with Mongo's Kiss. |
| 97 | Bubble Hit | **Bubble Hit** | Stock magic. |
| 98 | Drop Kick | **Boots & Buttons** | Custom descending cat-and-cookie finisher; source mechanics. |

### Donkey + Puss

| ID | Native source | Target name | Presentation |
| --- | --- | --- | --- |
| 99 | Red Pin | **Red Pin** | Stock magic. |
| 100 | Line Bomb | **Line Bomb** | Stock magic. |
| 101 | Frog Flare | **Frog Flare** | Stock magic. |

## Ordinary triple techniques

| ID | Participants | Native source | Target name | Presentation |
| --- | --- | --- | --- | --- |
| 102 | Shrek + Fiona + Donkey | Delta Force | **Delta Force** | Stock magic. |
| 103 | Shrek + Fiona + Pinocchio | Life Line | **Life Line** | Stock magic. |
| 104 | Shrek + Fiona + Puss | Arc Impulse | **Arc Impulse** | Stock magic. |
| 105 | Shrek + Fiona + Mongo | Final Kick | **Royal Crumb Stomp** | Custom coordinated kicks and enormous cookie footprint; source mechanics. |
| 106 | Shrek + Donkey + Pinocchio | Fire Zone | **Fire Zone** | Stock magic. |
| 107 | Shrek + Donkey + Puss | Delta Storm | **Delta Storm** | Stock magic. |
| 108 | Shrek + Donkey + Mongo | Gatling Kick | **Ogre Bakery Brawl** | Custom rapid kicks and fiery finish; source mechanics. |
| 109 | Shrek + Pinocchio + Puss | Triple Raid | **Pointy Trio** | Custom sword, rapier and extending-nose sequence; source mechanics. |
| 110 | Shrek + Pinocchio + Mongo | Twister | **Layers of Trouble** | Custom wood/crumb/ogre whirlwind; source mechanics. |
| 111 | Shrek + Puss + Mongo | 3D Attack | **Fairy Tale Beatdown** | Custom three-direction physical assault; source mechanics. |

## Button-gated triple techniques

The accessories remain colored Buttons with their original unlock behavior.

| ID | Participants | Native source | Target name | Button | Presentation |
| --- | --- | --- | --- | --- | --- |
| 112 | Fiona + Donkey + Farquaad | Dark Eternal | **Dark Eternal** | Black Button | Stock magic. |
| 113 | Shrek + Donkey + Farquaad | Omega Flare | **Omega Flare** | Blue Button | Stock magic. |
| 114 | Shrek + Pinocchio + Mongo | Spin Strike | **Three-Ring Circus** | Silver Button | Custom three-character spinning assault; source mechanics. |
| 115 | Shrek + Fiona + Mongo | Poyozo Dance | **Swamp Hoedown** | White Button | Custom absurd dance; source battle effect. |
| 116 | Shrek + Puss + Farquaad | Grand Dream | **Grand Dream** | Golden Button | Stock magic. |

The locked rock-triple party assignments also move their required singles: Omega Flare uses Lightning II + Hot Sauce (the Flare slot) + Dark Matter; Three-Ring Circus uses Swamp Piledriver + Timber! + Last Crumb; Swamp Hoedown uses Fart + Provoke + Crumb Cyclone; Grand Dream uses Life + Yarn Bomb + Dark Matter. Dark Eternal retains Ice II + Fire II + Dark Matter. These are the native prerequisite lists, not additional tech ownership changes.

Names, ownership and prerequisites are migrated together in the native build. All 39 custom or explicitly modified techniques have native presentations; stock magic needs no custom-animation task. Existing custom presentations for Lightning, Lightning II and Life are legacy implementation work and are not preserved. Swamp Belch's native cloud and Hot Sauce's native chili-bottle effect are active and required. Remaining work is independent-emulator and connected-progression acceptance, not further scope expansion.

## Help lines (November 10)

Every technique has its own help line in `content/tech-help.js`: one sentence of at most 31 characters that says what the move does in Shrek's terms and names no Chrono Trigger technique. `engine/tech-help.js` repacks the native help block for techniques 1 to 116 and places the lines that do not fit in the unused padding after it; the three category labels and "Can't run away" keep their strings. The menu labels in `content/techs.json` remain the names shown in battle; where they differ from the names above (for example **Storm Roar** for Storm Breath, **Are We There Yet?** and **Cold Snub** for Donkey's and Farquaad's renamed moves), `techs.json` is current.
