function print(value)
{
    process.stdout.write(value.toString() + "\n");
}

function assert(condition, message) 
{
    if (!condition) 
    {
        message = message || "Assertion failed";
        throw new Error(message);
    }
}

function factorial(n)
{
    if (n == 0 || n == 1)
        return 1;
    if (typeof factorial.cache == 'undefined')
        factorial.cache = [];
    if (factorial.cache[n] > 0)
        return factorial.cache[n];
    return factorial.cache[n] = factorial(n-1) * n;
}

function binomial(n, k)
{
    return factorial(n) / (factorial(k) * factorial(n-k));
}

function Unit(strength, hp, probability, firstHits) 
{
    this.strength = strength;
    this.hp = hp;
    this.probability = probability;
    this.firstHits = firstHits;
}
Unit.prototype.toString = function () 
{ 
    return this.strength.toString() + "s " + this.hp.toString() + "hp " + this.firstHits.toString() + "fh";
}

function multiBattle(attackers, defender)
{
    var attackersStates = [];
    var defenderStates = [];
    defenderStates[defender.hp] = 1;

    for (var i = 0; i < attackers.length; i++)
    {
        var defenderTmpStates = [];
        var attacker = attackers[i];
        attackersStates[i] = [];
        for (var defenderHp in defenderStates)
        {
            defender.hp = defenderHp;
            var result = battle(attacker, defender);
            attackersStates[i] = mergeStates(1.0, attackersStates[i], defenderStates[defenderHp], result[0]);
            defenderTmpStates = mergeStates(1.0, defenderTmpStates, defenderStates[defenderHp], result[1]);
        }
        defenderStates = defenderTmpStates;
    }
    return [attackersStates, defenderStates];
}

/*
    Given two units, calculate probability ofoutcome states. Returns
    two states arrays, each containing probability of remaining hp
 */
function battle(attacker, defender)
{
	var aStrength = (attacker.strength * attacker.hp / 100.0);
	var dStrength = (defender.strength * defender.hp / 100.0)
    var ratio = aStrength  / dStrength;
	
	// since patch 1.61 wounded units damage has changed to this formula (mean of wounded dmg strength and full health strength)
	var aDmgStrength = (attacker.strength + aStrength) / 2.0;
	var dDmgStrength = (defender.strength + dStrength) / 2.0;
	var dmgRatio = aDmgStrength / dDmgStrength;
	
    var attackerDmg = Math.floor(20 * (3 * dmgRatio + 1) / (3 + dmgRatio));
    var defenderDmg = Math.floor(20 * (3 + dmgRatio) / (3 * dmgRatio + 1));

    // print(attackerDmg);
    // print(defenderDmg);

    //attackerHits - after how many hits attacker dies
    var attackerHits = Math.ceil(attacker.hp / defenderDmg);
    var defenderHits = Math.ceil(defender.hp / attackerDmg);

    // print(attackerHits);
    // print(defenderHits);

    var attackerRoundOdds = ratio / (1 + ratio);
    var defenderRoundOdds = 1 / (1 + ratio);

    // print(attackerRoundOdds);
    // print(defenderRoundOdds);
    
    var firstHits = defender.firstHits - attacker.firstHits;

    return [calculateStates(attackerHits, attackerRoundOdds, attacker.hp, defenderHits, defenderRoundOdds, defenderDmg, -firstHits),
            calculateStates(defenderHits, defenderRoundOdds, defender.hp, attackerHits, attackerRoundOdds, attackerDmg, firstHits)];
}

// calculate states when unit1 wins. FirstHits - number of first hits for unit1
function calculateStates(hits1, roundOdds1, hp1, hits2, roundOdds2, dmg2, firstHits)
{
    var states = new Array();
    if (firstHits > 0)
    {
        for (var i = 0; i <= firstHits; i++)
        {
            // probability of "i" first hits
            var probability = Math.pow(roundOdds2, firstHits - i) * Math.pow(roundOdds1, i);
            var count = binomial(firstHits, i);
            var firstHitStates = calculateStates(hits1, roundOdds1, hp1, hits2 - i, roundOdds2, dmg2, 0);
            states = mergeStates(1.0, states, probability * count, firstHitStates);
        }
        return states;
    }
    if (firstHits < 0)
    {
        for (var i = 0; i <= -firstHits; i++)
        {
            // probability of "i" first hits
            var probability = Math.pow(roundOdds1, -firstHits - i) * Math.pow(roundOdds2, i);
            var count = binomial(-firstHits, i);
            var firstHitStates = calculateStates(hits1 - i, roundOdds1, hp1 - (i * dmg2), hits2, roundOdds2, dmg2, 0);
            states = mergeStates(1.0, states, probability * count, firstHitStates); 
        }
        return states;
    }
    
    if (hits1 <= 0)
    {
        states[0] = 1;
        return states;
    }
    else if (hits2 <= 0)
    {
        states[hp1] = 1;
        return states;
    }

    // hp -> probability
    for (var i = 0; i < hits1; i++)
    {
        // Probability of hits exchange when unit1 wins but unit2 makes "i" hits
        var probability = Math.pow(roundOdds1, hits2) * Math.pow(roundOdds2, i);
        // To avoid repetitions we consider only situations when unit1 scores last final hit
        // count - number of combinations when unit1 wins taking i hits from the unit2
        var count = binomial(i + hits2 - 1, i);
        states[hp1 - dmg2 * i] = count * probability;
    }
    return states;
}

function mergeStates(prob1, states1, prob2, states2)
{
    var states = new Array();
    for (var hp1 in states1)
        states[hp1] = states1[hp1] * prob1;
    for (var hp2 in states2)
    {
        var value = 0;
        if (typeof states[hp2] != "undefined")
            value = states[hp2];

        states[hp2] = states2[hp2] * prob2 + value;
    }
    return states;
}

function winChances(states)
{
    var chance = 0;
    for (var hp in states)
    {
        chance += states[hp];
    }
    return chance;
}

function printStates(states)
{
    for (var hp in states)
    {
        print("hp: " + hp.toString() + " " + states[hp]);
    }
    print("win " + winChances(states).toString());
}
//var commandLineArguments = process.argv.slice(2);
//process.stdout.write(commandLineArguments.join());

function unittest()
{
    assert(1 == factorial(1));
    assert(2 == factorial(2));
    assert(6 == factorial(3));
    assert(120 == factorial(5));
    assert(15 == binomial(6, 2));
    assert(126 == binomial(9, 4));
    
    var axe1 = new Unit(5.0 * 1.5 * 0.64, 64, 1.0, 0);
    var spear1 = new Unit(4.0 * 0.91, 91, 1.0, 0);

    var states1 = battle(axe1, spear1);
    assert(winChances(states1[0]) < 0.53);
    assert(0.52 < winChances(states1[0]));    
}


var warrior = new Unit(2.0, 100, 1.0, 0);
var archer = new Unit(3.0, 100, 1.0, 1);
var archerForest = new Unit(3.0 * 1.65, 100, 1.0, 1);
var archer1fs = new Unit(3.0, 100, 1.0, 2);
var archer1s = new Unit(3.3, 100, 1.0, 1);
var archerCityF20 = new Unit(3.0 * 1.70, 100, 1.0, 1);
var archerCityF25 = new Unit(3.0 * 1.75, 100, 1.0, 1);

function test(unit1, unit2)
{
    var states = battle(unit1, unit2);
    print(unit1);
    printStates(states[0]);
    print(unit2);
    printStates(states[1]);
}

function testMulti(attackers, defender)
{
    var states = multiBattle(attackers, defender);
    for (var i = 0; i < attackers.length; i++)
    {
        print("attacker " + i.toString());
        printStates(states[0][i]);
    }
    print("defender");
    printStates(states[1]);
}

//test(archer, archerForest);
testMulti([new Unit(3.0, 83, 1.0, 2), archer], archerForest);
//testMulti([archer, new Unit(3.3, 83, 1.0, 1)], archerForest);
//test(archer1fs, archerCityF25);
//test(warrior, new Unit(3.8 * 1.75 * 0.4, 40, 1.0, 1));
