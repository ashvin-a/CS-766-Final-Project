import requests  
import json  
  
url =  "https://stablediffusionapi.com/api/v4/dreambooth"  
  
payload = json.dumps({  
"key":  "zwDVuL2aAT674LKEK3RKsoUBnJt8O49EeBSrqu5XsFx3UMoULDq2AqwzkhpY",  
"model_id":  "stable-diffusion-xl-base-1.0",  
"prompt":  "ultra realistic close up portrait ((beautiful pale cyberpunk female with heavy black eyeliner)), blue eyes, shaved side haircut, hyper detail, cinematic lighting, magic neon, dark red city, Canon EOS R3, nikon, f/1.4, ISO 200, 1/160s, 8K, RAW, unedited, symmetrical balance, in-frame, 8K",  
"negative_prompt":  "painting, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, deformed, ugly, blurry, bad anatomy, bad proportions, extra limbs, cloned face, skinny, glitchy, double torso, extra arms, extra hands, mangled fingers, missing lips, ugly face, distorted face, extra legs, anime",  
"width":  "512",  
"height":  "512",  
"samples":  "1",  
"num_inference_steps":  "30",  
"safety_checker":  "no",  
"enhance_prompt":  "yes",  
"seed":  None,  
"guidance_scale":  7.5,  
"multi_lingual":  "no",  
"panorama":  "no",  
"self_attention":  "no",  
"upscale":  "no", 
"webhook":  None,  
"track_id":  None  
})  
  
headers =  {  
'Content-Type':  'application/json'  
}  
  
response = requests.request("POST", url, headers=headers, data=payload)  
  
print(response.text)
