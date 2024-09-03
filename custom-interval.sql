--explain analyze verbose

SELECT
	agent.name AS agent,
	stat.name AS stat,
	upload_info.uploaded_at AS uploaded_at,
--	baseline_history.upload_id AS baseline_upload_id,
	baseline_history.num_value AS baseline,
	current_history.num_value AS current,
	one_week_ago_upload.uploaded_at AS one_week_ago,
	one_week_ago_history.num_value AS one_week_ago_value,
	current_history.num_value - baseline_history.num_value AS gained,
	ROUND((current_history.num_value - baseline_history.num_value) / (NULLIF(extract(epoch from (current_upload.uploaded_at - baseline_upload.uploaded_at)), 0) / 86400)::numeric, 2) AS rate_per_day,
	current_history.num_value - one_week_ago_history.num_value AS gained_last_week,
	ROUND((current_history.num_value - one_week_ago_history.num_value) / (NULLIF(extract(epoch from (current_upload.uploaded_at - one_week_ago_upload.uploaded_at)), 0) / 86400)::numeric, 2) AS rate_last_week

FROM
	(
		SELECT
			agent.agent_id AS agent_id,
			upload.upload_id,
			upload.uploaded_at,
			FIRST_VALUE(upload_id) OVER upload_window AS baseline_upload_id,
			LAST_VALUE(upload_id) OVER upload_window AS last_upload_id,
			FIRST_VALUE(upload_id) OVER (
				PARTITION BY upload.agent_id
				ORDER BY upload.uploaded_at
				RANGE BETWEEN 
					'7 days'::interval PRECEDING
					AND
					UNBOUNDED FOLLOWING
			) AS one_week_ago_upload_id
		FROM
			agent JOIN upload USING (agent_id)
		WHERE
			upload.uploaded_at BETWEEN '2024-08-01' AND '2024-08-23'
		WINDOW
			upload_window AS (
				PARTITION BY upload.agent_id
				ORDER BY upload.uploaded_at
				RANGE BETWEEN 
					UNBOUNDED PRECEDING
					AND
					UNBOUNDED FOLLOWING	
			)
	) upload_info
	JOIN stat ON (true)
	JOIN agent ON (
		upload_info.agent_id = agent.agent_id
	)
	JOIN upload AS baseline_upload ON (
		upload_info.baseline_upload_id = baseline_upload.upload_id
	)
	JOIN history AS baseline_history ON (
		upload_info.baseline_upload_id = baseline_history.upload_id
		AND
		stat.stat_id = baseline_history.stat_id
	)
	JOIN upload AS one_week_ago_upload ON (
		upload_info.one_week_ago_upload_id = one_week_ago_upload.upload_id
	)
	JOIN history AS one_week_ago_history ON (
		upload_info.one_week_ago_upload_id = one_week_ago_history.upload_id
		AND
		stat.stat_id = one_week_ago_history.stat_id
	)
	JOIN upload AS current_upload ON (
		upload_info.upload_id = current_upload.upload_id
	)
	JOIN history AS current_history ON (
		upload_info.upload_id = current_history.upload_id
		AND
		stat.stat_id = current_history.stat_id
	)
--WHERE
--	agent.name IN ('eigood', 'Shooters42', 'peagmj', 'IISrPitufoII')
--	agent.name IN ('eigood', 'CurtisEFlush')
--	AND
--	stat.name = 'lifetime_ap'
WHERE
	stat.name != 'ap'
	AND
	agent.name = 'eigood'
ORDER BY
	agent.name,
	stat.name,
	upload_info.uploaded_at
