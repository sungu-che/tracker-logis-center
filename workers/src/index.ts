import { Node, parseHTML } from 'linkedom'

import { gzip, ungzip } from 'pako'

import { ethers } from 'ethers'

import { AwsClient } from 'aws4fetch'


var extractNumbersRegex = /\d+/g;


function getZeroUTC(date, day) {
	var date = new Date(date)

	date.setDate(date.getDate() - day)

	date.setUTCHours(0)
	date.setUTCMinutes(0)
	date.setUTCSeconds(0)
	date.setUTCMilliseconds(0)

	return date.getTime() // 'YYYY-MM-DDTHH:mm:ss.sssZ'
}


const isDiff = (obj1, obj2) => {
	// If both objects are null or undefined, they are not considered different.
	if (!obj1 && !obj2) {
		return false;
	}

	// If one is falsy and the other isn't, they are different.
	if (!obj1 || !obj2) {
		return true;
	}

	const keys1 = Object.keys(obj1);
	const keys2 = Object.keys(obj2);

	// If the number of keys is different, the objects are different.
	if (keys1.length !== keys2.length) {
		return true;
	}

	// Iterate over keys to check for differences.
	for (const key of keys1) {
		// Check for specific buffer comparison for keys named 'data'.
		if (key === 'data' && Buffer.isBuffer(obj1[key]) && Buffer.isBuffer(obj2[key])) {
			// Use Buffer.equals() for efficient byte-by-byte comparison.
			if (!obj1[key].equals(obj2[key])) {
				return true;
			}
		} else if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
			// Recursively call isDiff for nested objects.
			if (isDiff(obj1[key], obj2[key])) {
				return true;
			}
		} else if (obj1[key] !== obj2[key]) {
			// If values are not equal, the objects are different.
			return true;
		}
	}

	// If no differences are found, the objects are the same.
	return false;
};


function safeClone(obj) {
	const seen = new WeakMap();
	function clone(value) {
		if (typeof value !== "object" || value === null) return value;
		if (seen.has(value)) return null; // 순환 참조 제거
		const copy = Array.isArray(value) ? [] : {};
		seen.set(value, copy);
		for (const key in value) {
			copy[key] = clone(value[key]);
		}
		return copy;
	}
	return clone(obj);
}

function hashId(text){
	if(typeof text == "undefined"){
		var account = ethers.Wallet.createRandom()
		text = account.privateKey
	}

	var hashMessage = ethers.hashMessage(text)

	return ethers.computeAddress(hashMessage).toLowerCase()
}


async function Sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}


const twoPartDomains = ["co.kr","co.uk","co.jp","com.cn","co.in","com.mx","co.id","com.my","com.sg","com.ph","com.vn"];


async function Deepinfra(key, model, system, user, inlineData){
	// DeepInfra API 호출

	var messages = []

	if(inlineData){
		messages.push({
			type: "image_url",	// 여기서 URL 입력
			image_url: {
				url: inlineData.data
			}
		})
	}

	if(system){
		messages.push({ "role": "system", "content": system })
	}

	if(user){
		messages.push({ "role": "user", "content": user })
	}

	
		
	var body = {
		"model" : model,
		"messages": messages,
		"max_tokens": 5000,
		"temperature": 1
	}

	var pathname = 'chat/completions'

	var isEmbedding = model.indexOf('BAAI/bge-m3') > -1

	if(isEmbedding){
		pathname = 'embeddings'

		body = {
			"input": system + user,
			"model": model,
			"encoding_format": "float"
		}
	}

	var res = await fetch(`https://api.deepinfra.com/v1/openai/${pathname}`, {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${key}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	var json = await res.json();



	if(isEmbedding){
		return json.data[0].embedding
	}else{
		var content = json.choices[0].message.content;

		try{
			var results = JSON.parse(content)

			return safeClone(results)
		}catch(err){

		}

		try{
			if(user != null){
				content = content.replace(/```json/gi, "")
				content = content.replace(/```/gi, "")
				content = content.replace(/\n/gi,"")
				content = content.trim()
			}
				

			var results = JSON.parse(content)

			return safeClone(results)
		}catch(err){
			return content
		}
	}
}


/*
	logis 
		- pages 
		- tasks

	apac1-logis_items
	apac1-logis-goods
	apac1-logis-order
	apac1-logis-tracking
	apac1-logis-event

	...

*/ 


/*
	🌟 [CLIENT-SIDE EMBEDDING]
	- analytics 트랙도 commerce 트랙과 동일하게 임베딩을 서버에서 계산하지 않습니다.
	- 구조화(LLM 의도 추론 / 요약)만 Cron Worker 가 수행하고,
	  벡터 생성은 GPU 유무와 무관하게 항상 Client App(Tauri) 의 로컬 임베딩 모델이 담당합니다.
	- Client App 이 PUT(type=vector) 으로 올려준 벡터만 Vectorize 에 저장합니다.
*/
const CLIENT_EMBEDDING = true

const CenterRegion = "center_logis"

const LogisRegion = {
	// Western North America
	'us-w': 'wnam_logis',
	'ca-w': 'wnam_logis',

	// Eastern North America
	'us': 'enam_logis',
	'ca': 'enam_logis',
	'mx': 'enam_logis',
	'cu': 'enam_logis',
	'do': 'enam_logis',
	'pr': 'enam_logis',
	'jm': 'enam_logis',

	// Western Europe
	'gb': 'weur_logis',
	'ie': 'weur_logis',
	'fr': 'weur_logis',
	'de': 'weur_logis',
	'nl': 'weur_logis',
	'be': 'weur_logis',
	'lu': 'weur_logis',
	'ch': 'weur_logis',
	'at': 'weur_logis',
	'es': 'weur_logis',
	'pt': 'weur_logis',
	'it': 'weur_logis',
	'se': 'weur_logis',
	'no': 'weur_logis',
	'dk': 'weur_logis',
	'fi': 'weur_logis',

	// Eastern Europe
	'ru': 'eeur_logis',
	'pl': 'eeur_logis',
	'cz': 'eeur_logis',
	'hu': 'eeur_logis',
	'ro': 'eeur_logis',
	'bg': 'eeur_logis',
	'ua': 'eeur_logis',
	'gr': 'eeur_logis',
	'rs': 'eeur_logis',

	// Asia_Pacific
	'cn': 'apac_logis',
	'hk': 'apac_logis',
	'kr': 'apac_logis',
	'jp': 'apac_logis',
	'sg': 'apac_logis',
	'tw': 'apac_logis',
	'th': 'apac_logis',
	'vn': 'apac_logis',
	'my': 'apac_logis',
	'ph': 'apac_logis',
	'id': 'apac_logis',
	'in': 'apac_logis',
	'pk': 'apac_logis',
	'bd': 'apac_logis',

	// Oceania
	'au': 'oc_logis',
	'nz': 'oc_logis',
	'fj': 'oc_logis',
	'pg': 'oc_logis',

	// South America
	'br': 'enam_logis', // Brazil
	'ar': 'enam_logis', // Argentina
	'cl': 'enam_logis', // Chile
	'co': 'enam_logis', // Colombia
	'pe': 'enam_logis', // Peru

	// Africa
	'za': 'weur_logis', // South Africa
	'ng': 'weur_logis', // Nigeria
	'eg': 'weur_logis', // Egypt

	// Middle East
	'sa': 'eeur_logis', // Saudi Arabia
	'ae': 'eeur_logis', // United Arab Emirates
	'tr': 'eeur_logis', // Turkey
};



const tables = ['items', 'sales', 'event', 'talks', 'tracking']

const Hello = {
	"Korean": "안녕하세요 내용을 입력해주세요",
	"Japanese": "こんにちは、内容を入力してください",
	"English": "Hello, please enter the content",
	"Chinese": "你好，请输入内容",
	"French": "Bonjour, veuillez saisir le contenu",
	"German": "Hallo, bitte geben Sie den Inhalt ein",
	"Spanish": "Hola, por favor ingrese el contenido",
	"Russian": "Здравствуйте, пожалуйста, введите содержание",
	"Arabic": "مرحبًا، يرجى إدخال المحتوى"
}

const languageCodeToCountryCode = {
	'ko': 'kr', // Korean -> South Korea
	'ja': 'jp', // Japanese -> Japan
	'en': 'us', // English -> United States (가장 일반적인 영어를 사용하는 국가)
	'zh': 'cn', // Chinese -> China (가장 일반적인 중국어를 사용하는 국가)
	'fr': 'fr', // French -> France
	'de': 'de', // German -> Germany
	'es': 'es', // Spanish -> Spain
	'ru': 'ru', // Russian -> Russia
	'ar': 'sa', // Arabic -> Saudi Arabia
};


const languageCode = {
	// Western North America
	'us-w': 'English',
	'ca-w': 'English',

	// Eastern North America
	'us': 'English',
	'ca': 'English',
	'mx': 'Spanish',
	'cu': 'Spanish',
	'do': 'Spanish',
	'pr': 'Spanish',
	'jm': 'English',

	// Western Europe
	'gb': 'English',
	'ie': 'English',
	'fr': 'French',
	'de': 'German',
	'nl': 'English',
	'be': 'French',
	'lu': 'French',
	'ch': 'German',
	'at': 'German',
	'es': 'Spanish',
	'pt': 'Portuguese',
	'it': 'Italian',
	'se': 'Swedish',
	'no': 'Norwegian',
	'dk': 'Danish',
	'fi': 'Finnish',

	// Eastern Europe
	'ru': 'Russian',
	'pl': 'Polish',
	'cz': 'Czech',
	'hu': 'Hungarian',
	'ro': 'Romanian',
	'bg': 'Bulgarian',
	'ua': 'Ukrainian',
	'gr': 'Greek',
	'rs': 'Serbian',

	// Asia-Pacific
	'cn': 'Simplified Chinese',
	'hk': 'Traditional Chinese',
	'kr': 'Korean',
	'jp': 'Japanese',
	'sg': 'English',
	'tw': 'Traditional Chinese',
	'th': 'Thai',
	'vn': 'Vietnamese',
	'my': 'Malay',
	'ph': 'English',
	'id': 'Indonesian',
	'in': 'English',
	'pk': 'Urdu',
	'bd': 'Bengali',

	// Oceania
	'au': 'English',
	'nz': 'English',
	'fj': 'English',
	'pg': 'English',

	// South America
	'br': 'Portuguese', // Brazil
	'ar': 'Spanish', // Argentina
	'cl': 'Spanish', // Chile
	'co': 'Spanish', // Colombia
	'pe': 'Spanish', // Peru

	// Africa
	'za': 'English', // South Africa
	'ng': 'English', // Nigeria
	'eg': 'Arabic',  // Egypt

	// Middle East
	'sa': 'Arabic', // Saudi Arabia
	'ae': 'Arabic', // United Arab Emirates
	'tr': 'Turkish' // Turkey
}


export default {
	// Method GET, POST
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		const s3 = new AwsClient({
			accessKeyId: env.aws_access_key_id,
			secretAccessKey: env.aws_secret_access_key,
			service: 's3',
			region: env.aws_region,
		})

		var {
			// 도시 (예: "San Jose")
			city,
			// 국가 코드 (예: "US")
			country,
			// 국가 이름 (예: "United States")
			countryRegion,
			// 대륙 코드 (예: "NA")
			continent,
			// 위도 (예: "37.33940")
			latitude,
			// 경도 (예: "-121.89496")
			longitude,
			// 시도 (예: "California")
			region,
			// 시도 코드 (예: "CA")
			regionCode,
			// 타임존 (예: "America/Los_Angeles")
			timezone,
			// 우편번호 (예: "95113")
			postalCode,
			// AS 번호 (예: "13335")
			asOrganization,
		} = request.cf;

		// 요청자의 IP 주소
		var ip = request.headers.get('cf-connecting-ip');

		if(!ip){
			ip = request.headers.get('X-Real-IP')
		}

		// 응답 본문에 정보를 포함하여 반환
		var geoInfo = {
			ip,
			city,
			country,
			countryRegion,
			continent,
			latitude,
			longitude,
			region,
			regionCode,
			timezone,
			postalCode,
			asOrganization,
		};

		var FLAG = geoInfo.country.toLowerCase()

		var logisRegion = 'DB' // LogisRegion[FLAG]

		var zoneRegion = 'DB' // ''

		var language = languageCode[FLAG]

		console.log('geoInfo',JSON.stringify(geoInfo))

		try{
			var headers = new Headers()

			var cookies = {}

			var cookiesStr = request.headers.get('Cookie')

			var contentType = request.headers.get("Content-Type")
			var contentEncoding = request.headers.get("Content-Encoding")

			if(cookiesStr){
				cookiesStr.split(';').forEach(cookie => {
					const parts = cookie.split('=')
					if (parts.length === 2) {
						const key = parts[0].trim()
						const value = parts[1].trim()
						cookies[key] = value
					}
				})
			}

			const requestUrl = new URL(request.url)
			const queryParams = requestUrl.searchParams

			var req = {
				url:request.url,
				host:requestUrl.hostname,
				method:request.method,
				query:{},
				body:{}
			}

			if(queryParams){
				if(queryParams.size){
					queryParams.forEach((value, key) => {
						req.query[key] = value
					})
				}
			}

			const acceptLanguageHeader = request.headers.get('Accept-Language')

			let preferredLanguage = "" // 기본값 설정

			if (acceptLanguageHeader) {
				// 2. 가져온 헤더 값을 파싱하여 가장 선호하는 언어를 추출합니다.
				// 보통 첫 번째 항목이 가장 선호하는 언어입니다.
				// 복잡한 파싱 로직 (q 값 고려)은 필요에 따라 추가할 수 있습니다.

				const languages = acceptLanguageHeader.split(',')
				if (languages.length) {
					// 첫 번째 언어 코드 (예: "ko-KR")만 사용하고, q 값이나 추가 정보는 제거
					preferredLanguage = languages[0].split(';')[0].trim()
				}
			}


			var redirect = "https://console.logis.center/"

			var userAgent = request.headers.get('User-Agent')
			

			if(ip){
				var m = ip.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/)

				if(m){
					ip = m[0]
				}
			}


			cookies.hello = Hello[language]

			cookies.flag = FLAG

			cookies.href = decodeURIComponent(req.query.href).toLowerCase()

			var url = new URL(cookies.href) // or new URL(url)

			var pathname = url.pathname.toLowerCase()

			var link = (url.pathname+url.search).toLowerCase()

			var type = req.query.type

			var pageId = hashId(cookies.cc+pathname)

			var itemId = hashId(cookies.team+cookies.cc+link)

			cookies.cc = hashId(url.host)



			var created_at = 0

			if(!isNaN(req.query.created_at)){
				created_at = parseInt(req.query.created_at)
			}

			var now = Date.now()

			var current = new Date(now).toISOString()


			var balance

			if(cookies.hash || (req.query.hash && req.query.token)){
				try{
					if(cookies.hash && req.query.hash){
						if(cookies.hash != req.query.hash){
							cookies.signature = ""
						}
					}

					if(req.query.hash){
						cookies.hash = req.query.hash
					}

					if(req.query.token){
						cookies.token = req.query.token
					}

					var response = await s3.fetch(`https://${env.aws_bucket}.s3.${env.aws_region}.amazonaws.com/hash/${cookies.hash}`, {
						method:'HEAD'
					})


					if(response.status == 200){
						balance = 0
					}

					if(response.headers.get("vapid")){
						cookies.vapid = true
					}

					if(response.headers.get("subscription")){
						cookies.subscription = true
					}

					var email = response.headers.get("email")

					var phone = response.headers.get("phone")

					var address = response.headers.get("address")

					var token = response.headers.get("token")


					if (response.ok) {
						var headObject = {}

						response.headers.forEach((value, key) => {
							if (key.startsWith('x-amz-meta-')) {
								var metaKey = key.replace('x-amz-meta-', '')
								headObject[metaKey] = value
							}
						})


						if(headObject['email']){
							email = headObject['email']
						}

						if(headObject['phone']){
							phone = headObject['phone']
						}

						if(headObject['address']){
							address = headObject['address']
						}
						
						if(headObject['token']){
							token = headObject['token']
						}
					}

					if(email && token == cookies.token){
						cookies.email = email

						if(phone){
							cookies.phone = phone
						}

						cookies.address = address

					}else{
						headObject = undefined
					}

					headers.set('Set-Cookie', `hash=${cookies.hash}; Secure; HttpOnly; SameSite=None`)
					headers.append('Set-Cookie', `token=${cookies.token}; Secure; HttpOnly; SameSite=None`)

					if(cookies.team){
						headers.append('Set-Cookie', `team=${cookies.team}; Secure; HttpOnly; SameSite=None`)
					}
				}catch(err){
					console.log("errrrr",err)
					// cookies = {err : JSON.stringify(err), logisRegion : logisRegion, zoneRegion : zoneRegion}
					cookies = {err : JSON.stringify(err)}
				}
			}

			if(typeof balance == "undefined"){
				var account = ethers.Wallet.createRandom()
				var hash = account.address.toLowerCase()
					hash = hash.replace("0x","")

				var token = account.privateKey.toLowerCase()
					token = token.replace("0x","")

				try{
					var response = await fetch(
						await s3.sign(`https://${env.aws_bucket}.s3.${env.aws_region}.amazonaws.com/hash/${hash}`, {
							method:'PUT',
							headers:{
								'Content-Type': 'text/plain',
								...Object.fromEntries(
									Object.entries({
										balance: '1000',
										host: 'console.logis.center',
										token: token,
										email: '',
										ip: ip,
										phone: '',
										address: '',
									}).map(([key, value]) => [`x-amz-meta-${key}`, value])
								),
							},
							body:"",
							aws: {
								service: 's3',
								region: env.aws_region,
							}
						})
					)

					cookies.token = token
					cookies.hash = hash

					headers.set('Set-Cookie', `hash=${hash}; Secure; HttpOnly; SameSite=None`)
					headers.append('Set-Cookie', `token=${token}; Secure; HttpOnly; SameSite=None`)
				}catch(err){
					cookies.err = JSON.stringify(err)
					console.log("erraasd", err)
				}
			}


			var requestOrigin = request.headers.get('Origin')
			if (requestOrigin) {
				headers.set('Access-Control-Allow-Origin', requestOrigin)
			} else {
				headers.set('Access-Control-Allow-Origin', '*')
			}
			headers.set('Access-Control-Allow-Credentials', 'true')
			headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
			headers.set('Access-Control-Allow-Headers', 'Content-Type, Content-Encoding, Authorization, X-Requested-With')

			headers.set('Content-Security-Policy', `frame-ancestors 'self' ${url.origin};`)



			/*
				🌟 [CLIENT-SIDE EMBEDDING RECEIVER]
				Client App(Tauri) 이 로컬 임베딩 모델로 만든 벡터를 gzip 으로 올려주면
				여기서 Vectorize 에 그대로 upsert 합니다.
				서버는 절대 임베딩을 계산하지 않습니다.
			*/
			if(request.method == 'PUT'){
				var success = false

				var results = []

				

				headers.set('Content-Type', 'application/json')

				return new Response(JSON.stringify({
					results:results,
					success:success,
					session:cookies
				}), {
					headers:headers
				})
			}

			if(request.method == 'POST') {

				if(req.query.text){
					var text = decodeURIComponent(req.query.text)

					var query = {
						options:{
							topK: 50,
							returnValues: false, // true 이며 벡터 값 포함
							returnMetadata: 'all',
							filter : {}
						}
					}

					/*
						🌟 [CLIENT-SIDE EMBEDDING]
						서버는 더 이상 env.AI.run('@cf/google/embeddinggemma-300m') 을 호출하지 않습니다.
						Client App(Tauri) 이 로컬 임베딩 모델로 만든 질의 벡터를 gzip 바디로 올려주면 그대로 사용합니다.
					*/
					// var queryVector = null

					// try{
					// 	if(contentEncoding == "gzip"){
					// 		var buffer = await request.arrayBuffer()

					// 		if(buffer.byteLength){
					// 			var decompressedJsonString = new TextDecoder('utf-8').decode(ungzip(buffer))

					// 			var payload = JSON.parse(decompressedJsonString)

					// 			if(payload){
					// 				if(Array.isArray(payload)){
					// 					if(payload.length){
					// 						queryVector = payload
					// 					}
					// 				}else if(Array.isArray(payload.vector)){
					// 					if(payload.vector.length){
					// 						queryVector = payload.vector
					// 					}
					// 				}
					// 			}
					// 		}
					// 	}
					// }catch(err){
					// 	console.log('[EMBED-CLIENT] query vector parse err',err)
					// }

					var matches = []

					// if(queryVector){
					// 	console.log('[EMBED-CLIENT] Using client-side query vector. dim =', queryVector.length)

					// 	var vectorRes = await env.VECTORIZE.query(queryVector, query.options)

					// 	matches = vectorRes.matches ? vectorRes.matches : []
					// }else{
					// 	console.log('[EMBED-CLIENT] No client-side query vector supplied. Skipping vector search.')
					// }

					if(matches.length){
						for(var m = 0; m < matches.length; m++){
							delete matches[m].to
							delete matches[m].cc
							delete matches[m].ref
						}
						
						var system = `
							Provide a detailed report on the user’s query in Korean by interpreting the User Browser Action Log & Query Context and referencing the associated 'User Action Data'.

							User Action Vector Data (Combined JSON)
							${JSON.stringify(matches)}

							User Query (Natural Language) 
							> "${text}"

							## Notes on Metadata
							- **from:** user ID → instead of showing the hash value, represent users as User A, User B, User C, etc.
							- **type:** action type (click, hover, change etc.)  
							- The time reference is set to the current time: "${current}".
						`

						var content = null

						var context = await Deepinfra(env.deepinfra, 'openai/gpt-oss-20b', system, content)

						var arr = gzip(new TextEncoder('utf-8').encode(JSON.stringify({
							text : text,
							href : cookies.href,
							info : geoInfo
						})), { to: 'arraybuffer' })

						var question = {
							id : hashId(),
							type : 'question',
							flag : FLAG,
							from : cookies.hash,
							to : pageId,
							cc : cookies.cc,
							ref : '',
							data : arr.buffer,
							created_at:now-100,
							updated_at:now
						}


						var arr = gzip(new TextEncoder('utf-8').encode(JSON.stringify({
							text : context,
							href : cookies.href,
							info : geoInfo
						})), { to: 'arraybuffer' })

						var answer = {
							id : hashId(),
							type : 'answer',
							flag : FLAG,
							from : cookies.hash,
							to : pageId,
							cc : cookies.cc,
							ref : '',
							data : arr.buffer,
							created_at:now,
							updated_at:now
						}



						var statements = []

						statements.push(
							env.DB.prepare(`
								INSERT INTO items ("id","type","flag","from","to","cc","ref","data","created_at","updated_at")
								VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
								ON CONFLICT(id) DO UPDATE SET
									"type" = EXCLUDED."type",
									"flag" = EXCLUDED."flag",
									"from" = EXCLUDED."from",
									"to" = EXCLUDED."to",
									"cc" = EXCLUDED."cc",
									"ref" = EXCLUDED."ref",
									"data" = EXCLUDED."data",
									"created_at" = EXCLUDED."created_at",
									"updated_at" = EXCLUDED."updated_at"
							`).bind(
								question.id,
								question.type,
								question.flag,
								question.from,
								question.to,
								question.cc,
								question.ref,
								question.data,
								question.created_at,
								question.updated_at
							)
						)



						var arr = gzip(new TextEncoder('utf-8').encode(JSON.stringify(answer.data)), { to: 'arraybuffer' })

						statements.push(
							env.DB.prepare(`
								INSERT INTO items ("id","type","flag","from","to","cc","ref","data","created_at","updated_at")
								VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
								ON CONFLICT(id) DO UPDATE SET
									"type" = EXCLUDED."type",
									"flag" = EXCLUDED."flag",
									"from" = EXCLUDED."from",
									"to" = EXCLUDED."to",
									"cc" = EXCLUDED."cc",
									"ref" = EXCLUDED."ref",
									"data" = EXCLUDED."data",
									"created_at" = EXCLUDED."created_at",
									"updated_at" = EXCLUDED."updated_at"
							`).bind(
								answer.id,
								answer.type,
								answer.flag,
								answer.from,
								answer.to,
								answer.cc,
								answer.ref,
								answer.data,
								answer.created_at,
								answer.updated_at
							)
						)



						var { results, success, error } = await env.DB.batch(statements)

					}

				}else if(ethers.isAddress(req.query.state)){
					var task = {
						id : hashId(),
						type : type,
						flag : FLAG,
						from : cookies.hash,
						to : pageId,
						cc : cookies.cc,
						ref : '',
						data : {
							href : cookies.href,
							info : geoInfo
						}
					}

					try{
						if(req.query.referrer){
							var _url = new URL(decodeURIComponent(req.query.referrer))
							
							task.referrer = hashId(cookies.cc+_url.pathname.toLowerCase())
						}

					}catch(err){
						
					}

					try{
						var buffer = await request.arrayBuffer()
						if(buffer.byteLength){
							var jsonString
							if(contentEncoding == "gzip"){
								jsonString = new TextDecoder('utf-8').decode(ungzip(buffer))
							}else{
								jsonString = new TextDecoder('utf-8').decode(buffer)
							}
							var data = JSON.parse(jsonString)
							task.type = data.type
							task.data.action = data.action
							task.data.relate = data.relate
							task.data.origin = url.origin
							task.data.link = (url.pathname + url.search).toLowerCase()
							task.ref = hashId(task.cc+url.pathname)
							task.created_at = now
							task.updated_at = 0
							headers.set('Content-Type', 'application/json')
							var arr = gzip(new TextEncoder('utf-8').encode(JSON.stringify(task.data)), { to: 'arraybuffer' })
							var onConflict = "ON CONFLICT (id) DO NOTHING"
							// tasks 추가 작업
							var { results, success, error } =  await env.DB.prepare(`
								INSERT INTO items (
									"id","type","flag","from","to","cc","ref","data","created_at","updated_at"
								) VALUES (
									?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10
								) ${onConflict}
							`).bind(
								task.id,
								task.type,
								task.flag,
								task.from,
								task.to,
								task.cc,
								task.ref,
								arr.buffer,
								task.created_at,
								task.updated_at
							).run()
							return new Response(JSON.stringify({
								results:[],
								success:success ? req.query.state : false,
								session:cookies
							}), {
								headers:headers
							})
						}
					}catch(err){
						console.log('gzip or json err',err)
					}
				}
				
			}

			if(request.method == 'OPTIONS'){
				return new Response('', {
					headers:headers
				})
			}else{
				if(contentType == 'application/json'){
					headers.set('Content-Type', contentType)

					var from = req.query.from

					if(ethers.isAddress(req.query.from)){
						from = req.query.from
					}

					var to = ""

					if(ethers.isAddress(req.query.to)){
						to = req.query.to
					}

					var ref = ""

					if(req.query.ref){
						if(ethers.isAddress(req.query.ref)){
							ref = req.query.ref
						}
					}


					var day = !isNaN(req.query.day) ? parseInt(req.query.day) : 0

					// var condition = `AND "created_at" < ${created_at}`

					// var conditions = {}
					

					var tasks = []

					var items = []

					var { results, success, error } = await env.DB.prepare(
						`SELECT * FROM items WHERE "cc" = '${cookies.cc}' AND "created_at" < ${created_at} ORDER BY created_at DESC LIMIT 1000`
					).all()

					if(results.length){
						var item = results[0]

						for (const itemType in item) {
							if (item.hasOwnProperty(itemType)) {
								cookies[itemType] = item[itemType]
							}
						}

						for(var i = 0; i < results.length; i++){
							var item = results[i]

							item.table = 'items'
							
							items.push(item)
						}
					}


					console.log('[GET] type',type);

					return new Response(JSON.stringify({
						results:[...items],
						session:cookies
					}), {
						headers:headers
					})
				}else{
					headers.set('Content-Type', 'text/html; charset=utf-8')

					return new Response(`I'm a teapot!`, {
						status:418,
						headers: { "Content-Type": "text/html; charset=utf-8" },
					})
				}
			}
		}catch(err){
			console.log('err',err)
		}

		return new Response(`I'm a teapot!`, {
			status:418,
			headers: { "Content-Type": "text/html; charset=utf-8" },
		})
	},
} satisfies ExportedHandler<Env>