const express = require('express');
const router = express.Router();
const Profile = require('../../models/Profile');
const U3ser = require('../../models/Users')
const auth = require('../../middleware/auth');
const request = require('request');
const config = require('config');
const {check, validationResult} = require('express-validator');

//get request to get my (current) profile
//private

router.get('/me',auth, async (req,res)=> {
	try{
		const profile = await Profile.findOne({user: req.user.id}).populate('user', ['name','avatar']);
		if (!profile){
			return res.status(400).json({msg: "There is no profile for this user"});
		}
		res.json(profile);

	}catch(err){
		console.error(err.message);
		res.status(500).send('Server error');
	}

});

// post request to api/profile
//create or update user profile Private

router.post('/',[auth, [
	check('status', 'status is required').not().isEmpty(),
	check('skills', 'Skills are required').not().isEmpty()
	]
	], async(req,res)=>{

		const error = validationResult(req);
		if (!error.isEmpty()){
			return res.status(400).json({errors: error.array()});
		}

		const {
			company,
			website,
			location,
			bio,
			status,
			githubusername,
			skills,
			youtube,
			facebook,
			twitter,
			instagram,
			linkedin
		} = req.body;

		//build profile object

		const profileField = {};
		profileField.user = req.user.id;
		if (company) profileField.company = company;
		if (website) profileField.website = website;
		if (location) profileField.location = location;
		if (bio) profileField.bio = bio;
		if (status) profileField.status = status;
		if (githubusername) profileField.githubusername = githubusername;
		if (skills) profileField.skills = skills.split(',').map(skill=> skill.trim());
		//build social object
		profileField.social = {};
		if (youtube) profileField.social.youtube = youtube;
		if (facebook) profileField.social.facebook = facebook;
		if (twitter) profileField.social.twitter = twitter;
		if (instagram) profileField.social.instagram = instagram;
		if (linkedin) profileField.social.linkedin = linkedin;

		try{
			let profile = await Profile.findOne({user : req.user.id});
			if (profile){
				//update
				profile = await Profile.findOneAndUpdate({
					user: req.user.id
				},
				{
					$set: profileField
				},
				{
					new: true
				});

				return res.json(profile);
			}

			//create
			profile = new Profile(profileField);
			await profile.save();
			return res.json(profile);

		}catch(err){
			console.error(err.message);
			res.status(500).send("Server error")
		}
});


//get all profile to api/profile public

router.get('/', async (req,res)=>{
	try{
		const  profiles = await Profile.find().populate('user',['name', 'avatar']);
		res.json(profiles);


	}catch(error){
		console.error(error.message);
		res.status(500).send('Server error');
	}
})

// delete api/profile
//delete profile and user
//private

router.delete('/', auth, async (req, res)=>{
	try{
		await Profile.findOneAndRemove({user: req.user.id});
		await User.findOneAndRemove({_id: req.user.id});
		res.json({msg: 'User deleted.'})
	}catch(err){
		console.error(error.message);
		res.status(500).send('Server error');
	}
});

//put request append experience api/profile/experience

router.put('/experience',[auth,
		[
		check('title', 'Title is required').not().isEmpty(),
		check('company', 'Company is required').not().isEmpty(),
		check('from', 'From date is required').not().isEmpty()
		]
	],async (req,res)=>{

		const errors = validationResult(req);
		if (!errors.isEmpty()){
			return res.status(400).json({errors: errors.array()});
		}
		const {title,company,location,from,to,current,description} = req.body;
		const newExp = {title,company,location,from,to,current,description};

		try{
			const profile = await Profile.findOne({user : req.user.id})

			profile.experience.unshift(newExp);
			await profile.save();
			res.json({profile});

		}catch(err){
			console.error(error.message);
			res.status(500).send('Server error');
		}
});

// delete request for experience api/profile/experience/:exp_id

router.delete('/experience/:exp_id', auth, async (req, res) => {
	try{
		const profile = await Profile.findOne({user : req.user.id})

		const removeIndex = profile.experience.map(item => item.id).indexOf(req.params.exp_id);
		profile.experience.splice(removeIndex, 1);
		await profile.save()
		res.json({profile});
	}catch(err){
		console.error(err.message);
		res.status(500).send('Server error');
	}
})



//put request append education api/profile/education

router.put('/education',[auth,
		[
		check('school', 'School is required').not().isEmpty(),
		check('degree', 'Degree is required').not().isEmpty(),
		check('from', 'From date is required').not().isEmpty(),
		check('fieldofstudy','Field of study is required').not().isEmpty()
		]
	],async (req,res)=>{

		const errors = validationResult(req);
		if (!errors.isEmpty()){
			return res.status(400).json({errors: errors.array()});
		}
		const {school,degree,fieldofstudy,from,to,current,description} = req.body;
		const newEdu = {school,degree,fieldofstudy,from,to,current,description};

		try{
			const profile = await Profile.findOne({user : req.user.id})

			profile.education.unshift(newEdu);
			await profile.save();
			res.json({profile});

		}catch(err){
			console.error(error.message);
			res.status(500).send('Server error');
		}
});

// delete request for education api/profile/aducation/:edu_id

router.delete('/education/:edu_id', auth, async (req, res) => {
	try{
		const profile = await Profile.findOne({user : req.user.id})

		const removeIndex = profile.education.map(item => item.id).indexOf(req.params.edu_id);
		profile.education.splice(removeIndex, 1);
		await profile.save()
		res.json({profile});
	}catch(err){
		console.error(err.message);
		res.status(500).send('Server error');
	}
})

// get api/profile/github/:user_name

router.get('/github/:user_name', async (req, res)=>{
	try{
		const options = {
			uri: `https://api.github.com/users/${req.params.user_name}/repos?per_page=5&sort=created:asc&client_id=${config
				.get("githubClientId")}&client_secret=${config.get("githubSecret")}`,
			method: 'GET',
			headers: {'user-agent': 'node.js'}
		};
		request(options, (error, resp, body)=>{
			if (error) console.error(err.message);
			if (resp.statusCode !== 200) return res.status(404).json({msg:'No github Profile found'});
			res.json(JSON.parse(body));
		})

	}catch(err){
		console.error(err.message);
		res.status(500).send('Server error');
	}
});


module.exports = router;