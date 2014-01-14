window.UPDATE_INTERVAL = 3*1000;
window.HEARTBEAT_INTERVAL = 5*60*1000;
window.MAXIMUM_AGE = 54*60*60*1000;

window.rowToggle = false;

function init()
{
	window.maxkey = $("#notificationlist").data('maxkey');
	// Convert the timestamps to Date objects
	$("#notificationlist li").each(function()
	{
		var li = $(this);
		li.data('timestamp', new Date(li.data('timestamp') * 1000));
	});

	window.timesrun = 1;
	setInterval(heartbeat, window.HEARTBEAT_INTERVAL);

	setTimeout(update, 0);
}
$(init);

function heartbeat()
{
	// Make sure the update procedure is being run regularly, in case of network and/or browser glitches
	if (window.timesrun == 0)
		setTimeout(update, 0);

	window.timesrun = 0;
}

function update()
{
	window.timesrun++;

	$.ajax({
		'type': 'POST',
		'url': "notifications",
		'data': "mode=update&after=" + escape(window.maxkey),
		'dataType': 'json',
		'async': true,
		'cache': false,
		'success': updateSuccess,
		'error': updateError
	})
}

function updateSuccess(data)
{
	setTimeout(update, window.UPDATE_INTERVAL);
	// Add any new rows to the table
	$(data).each(function(){
		// The layout here should resemble what's generated by the HTML template
		var newRow = $('<li class="new">');
		if (window.rowToggle)
			newRow.addClass('even');
		else
			newRow.addClass('odd');
		window.rowToggle = !window.rowToggle;
		if (this.time)
		{
			newRow.data('timestamp', new Date(this.time * 1000));
			newRow.append('<div class="duration">');
		}
		if (this.channel)
			$('<div class="channel">').text(this.channel).appendTo(newRow);
		if (this.user)
		{
			var userDiv = $('<div class="user">');
			var url = "http://www.twitch.tv/" + this.user;
			if (this.avatar)
				userDiv.append($('<a>').attr('href', url).append($('<img>').attr('src', this.avatar))).append(' ');
			$('<a>').attr('href', url).text(this.user).appendTo(userDiv);
			userDiv.append(" just subscribed!").appendTo(newRow);
		}
		else
		{
			$('<div class="message">').text(this.message).appendTo(newRow);
		}
		newRow.click(function(){$(this).removeClass("new");});
		newRow.hide();
		$("#notificationlist").prepend(newRow);
		newRow.slideDown();

		if (this.key > window.maxkey)
			window.maxkey = this.key;
	});

	// Now update any existing rows
	// Including removing existing rows older than a day
	// (don't let old notifications stick around forever so that you can
	// just leave the page open forever without massive memory leaks)
	var now = new Date();
	$("#notificationlist li").each(function(){
		var li = $(this);
		var age = now - li.data('timestamp');
		if (age <= MAXIMUM_AGE)
			li.find('.duration').text(niceduration(age / 1000));
		else
			li.remove();
	});
}

function updateError(xhr, status, err)
{
	setTimeout(update, window.UPDATE_INTERVAL);
}
