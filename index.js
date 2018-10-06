var url1 = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSbeB7PfpqICtN55AdOTzJ4D4UUKTk_29sZxuTB3ZOoCKpcfEsdprC-fum7sT9LpqWbuKfSXWaw6cMt/pub?output=csv";
var url1b = "https://cors.io/?https://docs.google.com/spreadsheets/d/e/2PACX-1vSbeB7PfpqICtN55AdOTzJ4D4UUKTk_29sZxuTB3ZOoCKpcfEsdprC-fum7sT9LpqWbuKfSXWaw6cMt/pub?output=csv";
var url2 = "https://spreadsheets.google.com/feeds/list/1G4TrO9gcGu6ygPpTc6rt22uRYGwgLEobxPi7xy92tGQ/od6/public/values?alt=json";
var url3 = "https://sheetsu.com/apis/v1.0su/9e5a67c3d6d6";

var members = 9;
var gamesWinAScore = 5;
var teamStr = 'Team';
var playerResultSeparator = '|';

var display = {};

getData();

function getData()
{
	//Sheetsu.read(url3, {}, gotData);

	var xhr = new XMLHttpRequest();
	xhr.open('GET', url1b, true);
	xhr.onreadystatechange = function ()
	{
		if (xhr.readyState === 4 && xhr.status === 200)
		{
			pregotData(xhr.responseText);
		}
	};
	xhr.send();
}

function pregotData(text)
{
	var lines = text.split("\n");
	var firstRowCells = lines[0].split(",");
	var rows = [];
	for (var i = 1; i < lines.length; i++)
	{
		var cells = lines[i].split(",");
		var row = {};
		for (var i1 = 0; i1 < cells.length; i1++)
		{
			row[firstRowCells[i1].trim()] = cells[i1].trim();
		}
		rows.push(row);
	}
	gotData(rows);
	displayRankings();
}

function gotData(data)
{
	var dataDict = {};
	data.forEach(function (row)
	{
		var entity = row['Entity'];
		delete row['Entity'];
		dataDict[entity] = row;
	});

	var matchKeys = Object.keys(dataDict[teamStr]);

	var teamResults = dataDict[teamStr];
	for (var key in teamResults)
	{
		teamResults[key] = parseInt(teamResults[key]);
	}
	var teamScores = {};
	var teamBonus = {};
	for (var i = 0; i < matchKeys.length; i += 4)
	{
		var ct1 = (teamResults[matchKeys[i]]);
		var t1 = (teamResults[matchKeys[i + 1]]);
		var ct2 = (teamResults[matchKeys[i + 2]]);
		var t2 = (teamResults[matchKeys[i + 3]]);

		teamScores[matchKeys[i]] = Math.max(0, Math.ceil((ct1 - t1) / gamesWinAScore));
		teamScores[matchKeys[i + 1]] = Math.max(0, Math.ceil((t1 - ct1) / gamesWinAScore));
		teamScores[matchKeys[i + 2]] = Math.max(0, Math.ceil((ct2 - t2) / gamesWinAScore));
		teamScores[matchKeys[i + 3]] = Math.max(0, Math.ceil((t2 - ct2) / gamesWinAScore));

		if (ct1 > t1 && t2 > ct2) teamBonus[matchKeys[i + 2]] = 1;
		else if (t1 > ct1 && ct2 > t2) teamBonus[matchKeys[i + 3]] = 1;
	}
	console.log(teamResults);
	console.log(teamScores);
	console.log(teamBonus);

	var memResults = {};
	for (var name in dataDict)
	{
		if (name !== teamStr)
		{
			var memData = dataDict[name];
			var total = {k: 0, d: 0, mvp: 0};
			var finalScore = 0;
			for (var dmt in memData)
			{
				if (!memData[dmt]) delete memData[dmt];
				else
				{
					var split = memData[dmt].split(playerResultSeparator).map(Number);
					memData[dmt] = {k: split[0], d: split[1], mvp: split[2]};
					total.k += split[0];
					total.d += split[1];
					total.mvp += split[2];
					if (teamScores[dmt]) finalScore += teamScores[dmt];
					if (teamBonus[dmt]) finalScore += teamBonus[dmt];
				}
			}
			memResults[name] = {matches: memData, stats: total, final_score: finalScore};
		}
	}

	var matchesScore = {};
	for (i = 0; i < matchKeys.length; i += 2)
	{
		var matchKey1 = matchKeys[i];
		var matchKey2 = matchKeys[i + 1];
		var matchKey0 = matchKey1.replace('_CT', '').replace('_T', '');

		var matchRank = [];
		for (var name in memResults)
		{
			var result1 = memResults[name]['matches'][matchKey1];
			var result2 = memResults[name]['matches'][matchKey2];

			if (result1) matchRank.push({name: name, result: result1});
			if (result2) matchRank.push({name: name, result: result2});
		}
		matchRank.sort(function (a, b)
		{
			return compareStats(a.result, b.result);
		});

		var matchScore = {};
		for (var i1 = 0; i1 < matchRank.length; i1++)
		{
			var s = members - i1;
			matchScore[matchRank[i1].name] = s;
			memResults[matchRank[i1].name].final_score += s;
		}
		matchesScore[matchKey0] = matchScore;
	}

	console.log(matchesScore);
	console.log(memResults);

	var finalRanking = [];
	for (var name in memResults)
	{
		var n = JSON.parse(JSON.stringify(memResults[name]));
		n['name'] = name;
		finalRanking.push(n);
	}
	finalRanking.sort(function (a, b)
	{
		if (b.final_score > a.final_score) return 1;
		if (b.final_score === a.final_score) return compareStats(a.stats, b.stats);
		if (b.final_score < a.final_score) return -1;
		return 0;
	});
	console.log(finalRanking);

	display = finalRanking;
}

function displayRankings()
{
	var table = $('#rankings');
	for(var i=0 ; i<display.length; i++)
	{
		var newRow = $('#template-row').clone();
		newRow.removeAttr('id');

		var mem = display[i];

		$(newRow).find('.rank').html(i+1);
		$(newRow).find('.name').html(mem.name);
		$(newRow).find('.score').html(mem.final_score);
		$(newRow).find('.stats').html(''.concat(mem.stats.k,'/',mem.stats.d,'/',mem.stats.mvp));

		table.append(newRow);
	}
	$('#template-row').remove();
}

function compareStats(first, second)
{
	if (second.k > first.k) return 1;
	if (second.k === first.k)
	{
		if (second.d < first.d) return 1;
		if (second.d === first.d)
		{
			if (second.mvp > first.mvp) return 1;
			if (second.mvp === first.mvp) return 0;
			if (second.mvp < first.mvp) return -1;
		}
		if (second.d > first.d) return -1;
	}
	if (second.k < first.k) return -1;
	return 0;
}

